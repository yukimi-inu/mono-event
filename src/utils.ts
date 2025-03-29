import type { Caller, EventOptions, GenericFunction } from './types';
import type { AsyncEventHandler } from './types/async';
import type { EventHandler } from './types/sync';

/**
 * A compact structure that stores listener information
 */
export interface CompactListener<H extends GenericFunction> {
  h: H; // handler function
  c: Caller | null; // caller context
}

/**
 * Base event context that holds Maps of listeners (lazily initialized)
 */
export interface BaseEventContext<H extends GenericFunction> {
  listeners: Map<H, CompactListener<H>> | null; // Lazily initialized
  onceListeners: Map<H, CompactListener<H>> | null; // Lazily initialized

  // Methods defined in baseEventMethods
  add: (...args: unknown[]) => () => void;

  remove(...args: unknown[]): boolean;

  removeAll(): void;
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

  _emitParallel(args: T): Promise<void>;

  _emitSequential(args: T): Promise<void>;
}

/**
 * Context for restricted synchronous event emitters
 */
export interface RestrictedSyncEmitContext<T = unknown> {
  event: BaseEventContext<EventHandler<T>>;
  continueOnError: boolean;
  logErrors: boolean;
}

/**
 * Context for restricted asynchronous event emitters
 */
export interface RestrictedAsyncEmitContext<T = unknown> {
  event: BaseEventContext<AsyncEventHandler<T>>;
  parallel: boolean;
  continueOnError: boolean;
  logErrors: boolean;

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
 * Finds and removes a specific listener from the Map based on handler and caller.
 * Handles null map case.
 * Returns true if removed, otherwise false.
 */
function findAndRemove<H extends GenericFunction>(
  listenerMap: Map<H, CompactListener<H>> | null,
  handler: H,
  caller: Caller | null,
): boolean {
  if (!listenerMap) return false;

  const listener = listenerMap.get(handler);
  if (listener && listener.c === caller) {
    return listenerMap.delete(handler);
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
    if (logErrors) console.error('Error in event handler:', error);
    if (!continueOnError) throw error;
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
    if (logErrors) console.error('Error in async event handler:', error);
    if (!continueOnError) throw error;
  }
}

function emitSyncHandlers<T>(
  listeners: Map<EventHandler<T>, CompactListener<EventHandler<T>>> | null,
  onceListeners: Map<EventHandler<T>, CompactListener<EventHandler<T>>> | null,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): void {
  if (listeners && listeners.size > 0) {
    for (const listener of listeners.values()) {
      executeSyncHandler(listener, args, continueOnError, logErrors);
    }
  }

  if (onceListeners && onceListeners.size > 0) {
    const currentOnce = Array.from(onceListeners.values());
    onceListeners.clear();
    for (const listener of currentOnce) {
      executeSyncHandler(listener, args, continueOnError, logErrors);
    }
  }
}

async function emitAsyncHandlers<T>(
  listeners: Map<AsyncEventHandler<T>, CompactListener<AsyncEventHandler<T>>> | null,
  onceListeners: Map<AsyncEventHandler<T>, CompactListener<AsyncEventHandler<T>>> | null,
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
 * Handles async emission in parallel using Maps (handles null).
 */
async function emitAsyncParallel<T>(
  listeners: Map<AsyncEventHandler<T>, CompactListener<AsyncEventHandler<T>>> | null,
  onceListeners: Map<AsyncEventHandler<T>, CompactListener<AsyncEventHandler<T>>> | null,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  const promises: Promise<void>[] = [];
  const currentOnce = onceListeners && onceListeners.size > 0 ? Array.from(onceListeners.values()) : [];
  onceListeners?.clear();

  if (listeners && listeners.size > 0) {
    for (const listener of listeners.values()) {
      promises.push(executeAsyncHandler(listener, args, continueOnError, logErrors));
    }
  }
  if (currentOnce.length > 0) {
    for (const listener of currentOnce) {
      promises.push(executeAsyncHandler(listener, args, continueOnError, logErrors));
    }
  }
  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

/**
 * Handles async emission sequentially using Maps (handles null).
 */
async function emitAsyncSequential<T>(
  listeners: Map<AsyncEventHandler<T>, CompactListener<AsyncEventHandler<T>>> | null,
  onceListeners: Map<AsyncEventHandler<T>, CompactListener<AsyncEventHandler<T>>> | null,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  const currentOnce = onceListeners && onceListeners.size > 0 ? Array.from(onceListeners.values()) : [];
  onceListeners?.clear();

  if (listeners && listeners.size > 0) {
    for (const listener of listeners.values()) {
      await executeAsyncHandler(listener, args, continueOnError, logErrors);
    }
  }
  if (currentOnce.length > 0) {
    for (const listener of currentOnce) {
      await executeAsyncHandler(listener, args, continueOnError, logErrors);
    }
  }
}

const baseEventMethods = {
  add<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): () => void {
    const { handler, caller, options } = parseAddArgs<H>(args);
    const listener: CompactListener<H> = { h: handler, c: caller };

    let targetMap: Map<H, CompactListener<H>>;

    if (options.once) {
      if (!this.onceListeners) {
        this.onceListeners = new Map();
      }
      targetMap = this.onceListeners;
    } else {
      if (!this.listeners) {
        this.listeners = new Map();
      }
      targetMap = this.listeners;
    }

    targetMap.set(handler, listener);

    const self = this;
    return function unsubscribe() {
      if (caller !== null) {
        self.remove(caller, handler);
      } else {
        self.remove(handler);
      }
    };
  },

  remove<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): boolean {
    const { handler, caller } = parseRemoveArgs<H>(args);
    return findAndRemove(this.listeners, handler, caller) || findAndRemove(this.onceListeners, handler, caller);
  },

  removeAll<H extends GenericFunction>(this: BaseEventContext<H>): void {
    this.listeners?.clear();
    this.onceListeners?.clear();
  },
};

const syncEmitMethods = {
  emit<T>(this: SyncEventContext<T>, args: T): void {
    if ((!this.listeners || this.listeners.size === 0) && (!this.onceListeners || this.onceListeners.size === 0)) {
      return;
    }
    emitSyncHandlers(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },
};

const restrictedSyncEmitMethods = {
  emit<T>(this: RestrictedSyncEmitContext<T>, args: T): void {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.size === 0) && (!onceListeners || onceListeners.size === 0)) {
      return;
    }
    emitSyncHandlers(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },
};

const asyncEmitMethods = {
  async emit<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    if ((!this.listeners || this.listeners.size === 0) && (!this.onceListeners || this.onceListeners.size === 0)) {
      return;
    }
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
    if ((!this.listeners || this.listeners.size === 0) && (!this.onceListeners || this.onceListeners.size === 0)) {
      return;
    }
    await emitAsyncParallel(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },

  async _emitSequential<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    if ((!this.listeners || this.listeners.size === 0) && (!this.onceListeners || this.onceListeners.size === 0)) {
      return;
    }
    await emitAsyncSequential(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },
};

const restrictedAsyncEmitMethods = {
  async emit<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.size === 0) && (!onceListeners || onceListeners.size === 0)) {
      return;
    }
    await emitAsyncHandlers(listeners, onceListeners, args, this.parallel, this.continueOnError, this.logErrors);
  },

  async _emitParallel<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.size === 0) && (!onceListeners || onceListeners.size === 0)) {
      return;
    }
    await emitAsyncParallel(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },

  async _emitSequential<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.size === 0) && (!onceListeners || onceListeners.size === 0)) {
      return;
    }
    await emitAsyncSequential(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },
};

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
