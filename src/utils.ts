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
 * Base event context that holds arrays of listeners (lazily initialized)
 */
export interface BaseEventContext<H extends GenericFunction> {
  listeners: CompactListener<H>[] | null; // Lazily initialized array
  onceListeners: CompactListener<H>[] | null; // Lazily initialized array

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
  listeners: CompactListener<EventHandler<T>>[] | null,
  onceListeners: CompactListener<EventHandler<T>>[] | null,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): void {
  // Create copies of the listener arrays to iterate over
  const listenersCopy = listeners ? Array.from(listeners) : [];
  const onceListenersCopy = onceListeners ? Array.from(onceListeners) : [];

  // Use for-i loop for regular listeners (iterate over copy)
  if (listenersCopy.length > 0) {
    const len = listenersCopy.length;
    for (let i = 0; i < len; i++) {
      executeSyncHandler(listenersCopy[i], args, continueOnError, logErrors);
    }
  }

  // Use reverse for-i loop for once listeners (iterate over copy)
  // Remove from the original array after execution
  if (onceListenersCopy.length > 0) {
    for (let i = onceListenersCopy.length - 1; i >= 0; i--) {
      const listener = onceListenersCopy[i];
      executeSyncHandler(listener, args, continueOnError, logErrors);
      // Find and remove the listener from the original onceListeners array
      if (onceListeners) {
        const originalIndex = onceListeners.findIndex((l) => l === listener);
        if (originalIndex !== -1) {
          onceListeners.splice(originalIndex, 1);
        }
      }
    }
  }
}

async function emitAsyncHandlers<T>(
  listeners: CompactListener<AsyncEventHandler<T>>[] | null,
  onceListeners: CompactListener<AsyncEventHandler<T>>[] | null,
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
 * Handles async emission in parallel using Arrays (handles null).
 */
async function emitAsyncParallel<T>(
  listeners: CompactListener<AsyncEventHandler<T>>[] | null,
  onceListeners: CompactListener<AsyncEventHandler<T>>[] | null,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  const promises: Promise<void>[] = [];
  // Copy onceListeners before clearing, as they run in parallel
  const currentOnce = onceListeners ? Array.from(onceListeners) : [];
  if (onceListeners) onceListeners.length = 0; // Clear original array

  // Use for-i loop for regular listeners
  if (listeners) {
    const len = listeners.length;
    for (let i = 0; i < len; i++) {
      promises.push(executeAsyncHandler(listeners[i], args, continueOnError, logErrors));
    }
  }
  // Use for-i loop for the copied once listeners
  const onceLen = currentOnce.length;
  if (onceLen > 0) {
    for (let i = 0; i < onceLen; i++) {
      promises.push(executeAsyncHandler(currentOnce[i], args, continueOnError, logErrors));
    }
  }
  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

/**
 * Handles async emission sequentially using Arrays (handles null).
 */
async function emitAsyncSequential<T>(
  listeners: CompactListener<AsyncEventHandler<T>>[] | null,
  onceListeners: CompactListener<AsyncEventHandler<T>>[] | null,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  // Use for-i loop for regular listeners
  if (listeners) {
    const len = listeners.length;
    for (let i = 0; i < len; i++) {
      await executeAsyncHandler(listeners[i], args, continueOnError, logErrors);
    }
  }

  // Use reverse for-i loop for once listeners to allow safe removal
  if (onceListeners) {
    for (let i = onceListeners.length - 1; i >= 0; i--) {
      const listener = onceListeners[i];
      await executeAsyncHandler(listener, args, continueOnError, logErrors);
      // Remove the executed once listener
      onceListeners.splice(i, 1);
    }
  }
}

// --- Base Event Methods ---
const baseEventMethods = {
  add<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): () => void {
    const { handler, caller, options } = parseAddArgs<H>(args);
    const listener: CompactListener<H> = { h: handler, c: caller };

    let targetArray: CompactListener<H>[];

    if (options.once) {
      if (!this.onceListeners) {
        this.onceListeners = [];
      }
      targetArray = this.onceListeners;
    } else {
      if (!this.listeners) {
        this.listeners = [];
      }
      targetArray = this.listeners;
    }

    targetArray.push(listener);

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
    let removed = false;

    // Search listeners array backwards using a for loop
    if (this.listeners) {
      for (let i = this.listeners.length - 1; i >= 0; i--) {
        const listener = this.listeners[i];
        if (listener.h === handler && listener.c === caller) {
          this.listeners.splice(i, 1);
          removed = true;
          break; // Exit loop once found and removed
        }
      }
    }

    // Search onceListeners array backwards using a for loop if not removed from listeners
    if (!removed && this.onceListeners) {
      for (let i = this.onceListeners.length - 1; i >= 0; i--) {
        const listener = this.onceListeners[i];
        if (listener.h === handler && listener.c === caller) {
          this.onceListeners.splice(i, 1);
          removed = true;
          break; // Exit loop once found and removed
        }
      }
    }
    return removed;
  },

  removeAll<H extends GenericFunction>(this: BaseEventContext<H>): void {
    if (this.listeners) this.listeners.length = 0;
    if (this.onceListeners) this.onceListeners.length = 0;
  },
};

// --- Sync Emit Methods ---
const syncEmitMethods = {
  emit<T>(this: SyncEventContext<T>, args: T): void {
    if ((!this.listeners || this.listeners.length === 0) && (!this.onceListeners || this.onceListeners.length === 0)) {
      return;
    }
    emitSyncHandlers(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },
};

// --- Restricted Sync Emit Methods ---
const restrictedSyncEmitMethods = {
  emit<T>(this: RestrictedSyncEmitContext<T>, args: T): void {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.length === 0) && (!onceListeners || onceListeners.length === 0)) {
      return;
    }
    emitSyncHandlers(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },
};

// --- Async Emit Methods ---
const asyncEmitMethods = {
  async emit<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    if ((!this.listeners || this.listeners.length === 0) && (!this.onceListeners || this.onceListeners.length === 0)) {
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
    if ((!this.listeners || this.listeners.length === 0) && (!this.onceListeners || this.onceListeners.length === 0)) {
      return;
    }
    await emitAsyncParallel(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },

  async _emitSequential<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    if ((!this.listeners || this.listeners.length === 0) && (!this.onceListeners || this.onceListeners.length === 0)) {
      return;
    }
    await emitAsyncSequential(this.listeners, this.onceListeners, args, this.continueOnError, this.logErrors);
  },
};

// --- Restricted Async Emit Methods ---
const restrictedAsyncEmitMethods = {
  async emit<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.length === 0) && (!onceListeners || onceListeners.length === 0)) {
      return;
    }
    await emitAsyncHandlers(listeners, onceListeners, args, this.parallel, this.continueOnError, this.logErrors);
  },

  async _emitParallel<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.length === 0) && (!onceListeners || onceListeners.length === 0)) {
      return;
    }
    await emitAsyncParallel(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },

  async _emitSequential<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const { listeners, onceListeners } = this.event;
    if ((!listeners || listeners.length === 0) && (!onceListeners || onceListeners.length === 0)) {
      return;
    }
    await emitAsyncSequential(listeners, onceListeners, args, this.continueOnError, this.logErrors);
  },
};

// --- Emitter Function ---
/**
 * Creates an emitter function for an event
 * This function is cached and the same reference is returned each time
 * @param instance The event instance
 * @returns A function that calls emit() with the provided argument
 */
export function createEmitter<T, E extends { emit(args: T): unknown }>(instance: E): (args: T) => void {
  // Create a function that calls emit() with the provided argument
  return function emitter(args: T): void {
    instance.emit(args);
  };
}

// --- Prototypes ---
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
