import type {Caller, EventOptions, GenericFunction} from './types';
import type {AsyncEventHandler} from './types/async';
import type {EventHandler} from './types/sync';

/**
 * A compact structure that stores listener information
 */
export interface CompactListener<H extends GenericFunction> {
  h: H; // handler function
  c: Caller | null; // caller context
}

/**
 * Base event context that holds arrays of listeners
 */
export interface BaseEventContext<H extends GenericFunction> {
  listeners: Array<CompactListener<H>>;
  onceListeners: Array<CompactListener<H>>;
}

/**
 * Context for synchronous events
 */
export interface SyncEventContext<T = unknown> extends BaseEventContext<EventHandler<T>> {
  continueOnError: boolean;
  logErrors: boolean;
}

/**
 * Context for asynchronous events
 */
export interface AsyncEventContext<T = unknown> extends BaseEventContext<AsyncEventHandler<T>> {
  parallel: boolean;
  continueOnError: boolean;
  logErrors: boolean;

  // Private emission methods
  _emitParallel(args: T): Promise<void>;

  _emitSequential(args: T): Promise<void>;
}

/**
 * Context for restricted synchronous event emitters
 */
export interface RestrictedSyncEmitContext<T = unknown> {
  // Reference to the base event context
  event: BaseEventContext<EventHandler<T>>;
  continueOnError: boolean;
  logErrors: boolean;
}

/**
 * Context for restricted asynchronous event emitters
 */
export interface RestrictedAsyncEmitContext<T = unknown> {
  // Reference to the base event context
  event: BaseEventContext<AsyncEventHandler<T>>;
  parallel: boolean;
  continueOnError: boolean;
  logErrors: boolean;

  // Private emission methods
  _emitParallel(args: T): Promise<void>;

  _emitSequential(args: T): Promise<void>;
}

/**
 * Minimizes object creation by reusing a single result object
 * in argument parsing for add()
 */
export function parseAddArgs<H extends GenericFunction>(
  args: unknown[],
): { handler: H; caller: Caller | null; options: EventOptions } {
  const isFunc = typeof args[0] === 'function';

  return {
    handler: isFunc ? (args[0] as H) : (args[1] as H),
    caller: isFunc ? null : (args[0] as Caller),
    options: ((isFunc ? args[1] : args[2]) as EventOptions) || {},
  };
}

/**
 * Creates an unsubscribe function that removes the specified listener.
 */
export function createUnsubscribe<H extends GenericFunction>(
  listeners: Array<CompactListener<H>>,
  listener: CompactListener<H>,
): () => void {
  return function unsubscribe() {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * Minimizes object creation by reusing a single result object
 * in argument parsing for remove()
 */
export function parseRemoveArgs<H extends GenericFunction>(args: unknown[]): { handler: H; caller: Caller | null } {
  const isSingle = args.length === 1;
  return {
    handler: isSingle ? (args[0] as H) : (args[1] as H),
    caller: isSingle ? null : (args[0] as Caller),
  };
}

/**
 * Finds and removes a specific listener from the array.
 * Returns true if removed, otherwise false.
 */
export function findAndRemove<H extends GenericFunction>(
  listeners: Array<CompactListener<H>>,
  handler: H,
  caller: Caller | null,
): boolean {
  for (let i = 0; i < listeners.length; i++) {
    const l = listeners[i];
    if (l.c === caller && l.h === handler) {
      listeners.splice(i, 1);
      return true;
    }
  }
  return false;
}

/**
 * Executes a synchronous handler with error handling.
 */
export function executeSyncHandler<T>(
  listener: CompactListener<EventHandler<T>> | undefined,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): void {
  if (!listener) return;

  try {
    if (listener.c) {
      listener.h.call(listener.c, args);
    } else {
      listener.h(args);
    }
  } catch (error) {
    if (logErrors) {
      console.error('Error in event handler:', error);
    }
    if (!continueOnError) {
      throw error;
    }
  }
}

/**
 * Executes an asynchronous handler with error handling.
 */
export async function executeAsyncHandler<T>(
  listener: CompactListener<AsyncEventHandler<T>> | undefined,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  if (!listener) return;

  try {
    if (listener.c) {
      await listener.h.call(listener.c, args);
    } else {
      await listener.h(args);
    }
  } catch (error) {
    if (logErrors) {
      console.error('Error in async event handler:', error);
    }
    if (!continueOnError) {
      throw error;
    }
  }
}

/* ------------------------------------------------------------------
   Common helper function for synchronous emission
------------------------------------------------------------------ */
function emitSyncHandlers<T>(
  listeners: Array<CompactListener<EventHandler<T>>>,
  onceListeners: Array<CompactListener<EventHandler<T>>>,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): void {
  // Handle regular (persistent) listeners
  if (listeners.length > 0) {
    const current = [...listeners]; // copy to avoid modification issues
    for (const listener of current) {
      executeSyncHandler(listener, args, continueOnError, logErrors);
    }
  }

  // Handle "once" listeners
  if (onceListeners.length > 0) {
    const currentOnce = [...onceListeners];
    onceListeners.length = 0; // Clear onceListeners immediately
    for (const listener of currentOnce) {
      executeSyncHandler(listener, args, continueOnError, logErrors);
    }
  }
}

/* ------------------------------------------------------------------
   Common helper function for async emission
   (chooses between parallel or sequential execution)
------------------------------------------------------------------ */
async function emitAsyncHandlers<T>(
  listeners: Array<CompactListener<AsyncEventHandler<T>>>,
  onceListeners: Array<CompactListener<AsyncEventHandler<T>>>,
  args: T,
  parallel: boolean,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  if (parallel) {
    await emitAsyncParallel(listeners, onceListeners, args, continueOnError, logErrors);
  } else {
    await emitAsyncSequential(listeners, onceListeners, args, continueOnError, logErrors);
  }
}

/**
 * Handles async emission in parallel.
 */
async function emitAsyncParallel<T>(
  listeners: Array<CompactListener<AsyncEventHandler<T>>>,
  onceListeners: Array<CompactListener<AsyncEventHandler<T>>>,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  const promises: Promise<void>[] = [];

  // Handle regular listeners
  if (listeners.length > 0) {
    const current = [...listeners];
    for (const listener of current) {
      promises.push(executeAsyncHandler(listener, args, continueOnError, logErrors));
    }
  }

  // Handle "once" listeners
  if (onceListeners.length > 0) {
    const currentOnce = [...onceListeners];
    onceListeners.length = 0;
    for (const listener of currentOnce) {
      promises.push(executeAsyncHandler(listener, args, continueOnError, logErrors));
    }
  }

  // Wait until all promises have settled
  await Promise.all(promises);
}

/**
 * Handles async emission sequentially.
 */
async function emitAsyncSequential<T>(
  listeners: Array<CompactListener<AsyncEventHandler<T>>>,
  onceListeners: Array<CompactListener<AsyncEventHandler<T>>>,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  // Handle regular listeners
  if (listeners.length > 0) {
    const current = [...listeners];
    for (const listener of current) {
      await executeAsyncHandler(listener, args, continueOnError, logErrors);
    }
  }

  // Handle "once" listeners
  if (onceListeners.length > 0) {
    const currentOnce = [...onceListeners];
    onceListeners.length = 0;
    for (const listener of currentOnce) {
      await executeAsyncHandler(listener, args, continueOnError, logErrors);
    }
  }
}

/* ------------------------------------------------------------------
   Base methods (add, remove, removeAll) shared by all event contexts
------------------------------------------------------------------ */
const baseEventMethods = {
  add<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): () => void {
    const {handler, caller, options} = parseAddArgs<H>(args);

    const listener: CompactListener<H> = {h: handler, c: caller};
    const targetArray = options.once ? this.onceListeners : this.listeners;
    targetArray.push(listener);

    // Return unsubscribe function
    return createUnsubscribe(targetArray, listener);
  },

  remove<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): boolean {
    const {handler, caller} = parseRemoveArgs<H>(args);
    return findAndRemove(this.listeners, handler, caller) || findAndRemove(this.onceListeners, handler, caller);
  },

  removeAll<H extends GenericFunction>(this: BaseEventContext<H>): void {
    this.listeners.length = 0;
    this.onceListeners.length = 0;
  },
};

/* ------------------------------------------------------------------
   Sync event emission methods
------------------------------------------------------------------ */
const syncEmitMethods = {
  emit<T>(this: SyncEventContext<T>, args: T): void {
    if (!this.listeners.length && !this.onceListeners.length) return;
    emitSyncHandlers(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },
};

/* ------------------------------------------------------------------
   Restricted sync event emission methods
------------------------------------------------------------------ */
const restrictedSyncEmitMethods = {
  emit<T>(this: RestrictedSyncEmitContext<T>, args: T): void {
    const {listeners, onceListeners} = this.event;
    if (!listeners.length && !onceListeners.length) return;
    emitSyncHandlers(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },
};

/* ------------------------------------------------------------------
   Async event emission methods
------------------------------------------------------------------ */
const asyncEmitMethods = {
  async emit<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    if (!this.listeners.length && !this.onceListeners.length) return;
    await emitAsyncHandlers(
      this.listeners,
      this.onceListeners,
      args,
      this.parallel,
      this.continueOnError,
      this.logErrors,
    );
  },

  async _emitParallel<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    await emitAsyncParallel(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },

  async _emitSequential<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    await emitAsyncSequential(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },
};

/* ------------------------------------------------------------------
   Restricted async event emission methods
------------------------------------------------------------------ */
const restrictedAsyncEmitMethods = {
  async emit<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const {listeners, onceListeners} = this.event;
    if (!listeners.length && !onceListeners.length) return;
    await emitAsyncHandlers(listeners, onceListeners, args, this.parallel, this.continueOnError, this.logErrors);
  },

  async _emitParallel<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const {listeners, onceListeners} = this.event;
    await emitAsyncParallel(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },

  async _emitSequential<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const {listeners, onceListeners} = this.event;
    await emitAsyncSequential(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },
};

/* ------------------------------------------------------------------
   Prototype objects with assigned methods
------------------------------------------------------------------ */
export const monoProto = Object.create(null);
Object.assign(monoProto, baseEventMethods, syncEmitMethods);

export const monoRestrictEventProto = Object.create(null);
Object.assign(monoRestrictEventProto, baseEventMethods);

export const monoRestrictEmitProto = Object.create(null);
Object.assign(monoRestrictEmitProto, restrictedSyncEmitMethods);

export const monoAsyncProto = Object.create(null);
Object.assign(monoAsyncProto, baseEventMethods, asyncEmitMethods);

export const monoRestrictAsyncEventProto = Object.create(null);
Object.assign(monoRestrictAsyncEventProto, baseEventMethods);

export const monoRestrictAsyncEmitProto = Object.create(null);
Object.assign(monoRestrictAsyncEmitProto, restrictedAsyncEmitMethods);
