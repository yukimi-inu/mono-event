/**
 * Shared utilities for mono-event implementations
 */

import type {Caller, EmitterOptions, EventOptions, GenericFunction} from './types';
import type {AsyncEventHandler} from './types/async';
import type {EventHandler} from './types/sync';

/**
 * Compact listener information structure with short property names
 */
export interface CompactListener<H extends GenericFunction> {
  h: H; // handler
  c: Caller | null; // caller
}

/**
 * Base event context interface with common properties and methods
 */
export interface BaseEventContext<H extends GenericFunction> {
  // Arrays to store listeners
  listeners: Array<CompactListener<H>>;
  onceListeners: Array<CompactListener<H>>;
}

/**
 * Context for synchronous events
 */
export interface SyncEventContext<T = unknown> extends BaseEventContext<EventHandler<T>> {
  // Error handling options
  continueOnError: boolean;
  logErrors: boolean;
}

/**
 * Context for asynchronous events
 */
export interface AsyncEventContext<T = unknown> extends BaseEventContext<AsyncEventHandler<T>> {
  // Execution options
  parallel: boolean;
  continueOnError: boolean;
  logErrors: boolean;
  
  // Private methods for emission strategies
  _emitParallel(args: T): Promise<void>;
  _emitSequential(args: T): Promise<void>;
}

/**
 * Context for restricted synchronous event emitters
 */
export interface RestrictedSyncEmitContext<T = unknown> {
  // Reference to the event object
  event: BaseEventContext<EventHandler<T>>;
  // Error handling options
  continueOnError: boolean;
  logErrors: boolean;
}

/**
 * Context for restricted asynchronous event emitters
 */
export interface RestrictedAsyncEmitContext<T = unknown> {
  // Reference to the event object
  event: BaseEventContext<AsyncEventHandler<T>>;
  // Execution options
  parallel: boolean;
  continueOnError: boolean;
  logErrors: boolean;
  
  // Private methods for emission strategies
  _emitParallel(args: T): Promise<void>;
  _emitSequential(args: T): Promise<void>;
}

/**
 * Optimized argument parsing with minimal object creation
 */
export function parseAddArgs<H extends GenericFunction>(
  args: unknown[],
): { handler: H; caller: Caller | null; options: EventOptions } {
  const isFunc = typeof args[0] === 'function';
  // Reuse the same object for all calls to reduce allocations
  const result = {
    handler: isFunc ? (args[0] as H) : (args[1] as H),
    caller: isFunc ? null : (args[0] as Caller),
    options: ((isFunc ? args[1] : args[2]) as EventOptions) || {},
  };
  return result;
}

/**
 * Optimized unsubscribe function
 */
export function createUnsubscribe<H extends GenericFunction>(
  listeners: Array<CompactListener<H>>,
  listener: CompactListener<H>,
): () => void {
  // Use closure to avoid creating new functions
  return function unsubscribe() {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

/**
 * Optimized argument parsing for remove
 */
export function parseRemoveArgs<H extends GenericFunction>(args: unknown[]): { handler: H; caller: Caller | null } {
  const isSingle = args.length === 1;
  return {
    handler: isSingle ? (args[0] as H) : (args[1] as H),
    caller: isSingle ? null : (args[0] as Caller),
  };
}

/**
 * Optimized find and remove
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
 * Execute a synchronous handler with error handling
 */
export function executeSyncHandler<T>(
  listener: CompactListener<EventHandler<T>> | undefined,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): void {
  // Skip if listener is undefined (might happen if removed during iteration)
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
 * Execute an asynchronous handler with error handling
 */
export async function executeAsyncHandler<T>(
  listener: CompactListener<AsyncEventHandler<T>> | undefined,
  args: T,
  continueOnError: boolean,
  logErrors: boolean,
): Promise<void> {
  // Skip if listener is undefined (might happen if removed during iteration)
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

// ===== Base Event Methods =====

/**
 * Base methods for all event types
 */
const baseEventMethods = {
  add<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): () => void {
    const parsed = parseAddArgs<H>(args);

    // Create listener info object with short property names
    const listener: CompactListener<H> = {
      h: parsed.handler,
      c: parsed.caller,
    };

    // Store in appropriate array based on once option
    const targetArray = parsed.options.once ? this.onceListeners : this.listeners;
    targetArray.push(listener);

    // Return unsubscribe function
    return createUnsubscribe(targetArray, listener);
  },

  remove<H extends GenericFunction>(this: BaseEventContext<H>, ...args: unknown[]): boolean {
    const {handler, caller} = parseRemoveArgs<H>(args);

    // Try to remove from regular listeners first (more common case)
    return findAndRemove(this.listeners, handler, caller) || findAndRemove(this.onceListeners, handler, caller);
  },

  removeAll<H extends GenericFunction>(this: BaseEventContext<H>): void {
    // Empty arrays (fastest method)
    this.listeners.length = 0;
    this.onceListeners.length = 0;
  },
};

/**
 * Methods for synchronous event emission
 */
const syncEmitMethods = {
  emit<T>(this: SyncEventContext<T>, args: T): void {
    // Fast path for no listeners
    if (!this.listeners.length && !this.onceListeners.length) return;

    // Execute regular listeners
    if (this.listeners.length > 0) {
      // Create a copy to avoid issues with modification during iteration
      const currentListeners = [...this.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        executeSyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }

    // Execute once listeners and clear them
    if (this.onceListeners.length > 0) {
      // Create a copy of once listeners
      const currentOnceListeners = [...this.onceListeners];

      // Clear the once listeners array immediately
      this.onceListeners.length = 0;

      // Execute the once listeners
      for (let i = 0; i < currentOnceListeners.length; i++) {
        const listener = currentOnceListeners[i];
        executeSyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }
  },
};

/**
 * Methods for restricted synchronous event emission
 */
const restrictedSyncEmitMethods = {
  emit<T>(this: RestrictedSyncEmitContext<T>, args: T): void {
    // Fast path for no listeners
    if (!this.event.listeners.length && !this.event.onceListeners.length) return;

    // Execute regular listeners
    if (this.event.listeners.length > 0) {
      // Create a copy to avoid issues with modification during iteration
      const currentListeners = [...this.event.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        executeSyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }

    // Execute once listeners and clear them
    if (this.event.onceListeners.length > 0) {
      // Create a copy of once listeners
      const currentOnceListeners = [...this.event.onceListeners];

      // Clear the once listeners array immediately
      this.event.onceListeners.length = 0;

      // Execute the once listeners
      for (let i = 0; i < currentOnceListeners.length; i++) {
        const listener = currentOnceListeners[i];
        executeSyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }
  },
};

/**
 * Methods for asynchronous event emission
 */
const asyncEmitMethods = {
  async emit<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    // Fast path for no listeners
    if (!this.listeners.length && !this.onceListeners.length) return;

    if (this.parallel) {
      await this._emitParallel(args);
    } else {
      await this._emitSequential(args);
    }
  },

  // Private method for parallel execution
  async _emitParallel<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    const promises: Promise<void>[] = [];

    // Execute regular listeners
    if (this.listeners.length > 0) {
      const currentListeners = [...this.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        if (!listener) continue;

        promises.push(executeAsyncHandler(listener, args, this.continueOnError, this.logErrors));
      }
    }

    // Execute once listeners
    if (this.onceListeners.length > 0) {
      const currentOnceListeners = [...this.onceListeners];
      this.onceListeners.length = 0;

      for (let i = 0; i < currentOnceListeners.length; i++) {
        const listener = currentOnceListeners[i];
        if (!listener) continue;

        promises.push(executeAsyncHandler(listener, args, this.continueOnError, this.logErrors));
      }
    }

    // Wait for all promises to complete
    await Promise.all(promises);
  },

  // Private method for sequential execution
  async _emitSequential<T>(this: AsyncEventContext<T>, args: T): Promise<void> {
    // Execute regular listeners
    if (this.listeners.length > 0) {
      const currentListeners = [...this.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        if (!listener) continue;

        await executeAsyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }

    // Execute once listeners
    if (this.onceListeners.length > 0) {
      const currentOnceListeners = [...this.onceListeners];
      this.onceListeners.length = 0;

      for (let i = 0; i < currentOnceListeners.length; i++) {
        const listener = currentOnceListeners[i];
        if (!listener) continue;

        await executeAsyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }
  },
};

/**
 * Methods for restricted asynchronous event emission
 */
const restrictedAsyncEmitMethods = {
  async emit<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    // Fast path for no listeners
    if (!this.event.listeners.length && !this.event.onceListeners.length) return;

    if (this.parallel) {
      await this._emitParallel(args);
    } else {
      await this._emitSequential(args);
    }
  },

  // Private method for parallel execution
  async _emitParallel<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    const promises: Promise<void>[] = [];

    // Execute regular listeners
    if (this.event.listeners.length > 0) {
      const currentListeners = [...this.event.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        if (!listener) continue;

        promises.push(executeAsyncHandler(listener, args, this.continueOnError, this.logErrors));
      }
    }

    // Execute once listeners
    if (this.event.onceListeners.length > 0) {
      const currentOnceListeners = [...this.event.onceListeners];
      this.event.onceListeners.length = 0;

      for (let i = 0; i < currentOnceListeners.length; i++) {
        const listener = currentOnceListeners[i];
        if (!listener) continue;

        promises.push(executeAsyncHandler(listener, args, this.continueOnError, this.logErrors));
      }
    }

    // Wait for all promises to complete
    await Promise.all(promises);
  },

  // Private method for sequential execution
  async _emitSequential<T>(this: RestrictedAsyncEmitContext<T>, args: T): Promise<void> {
    // Execute regular listeners
    if (this.event.listeners.length > 0) {
      const currentListeners = [...this.event.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        if (!listener) continue;

        await executeAsyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }

    // Execute once listeners
    if (this.event.onceListeners.length > 0) {
      const currentOnceListeners = [...this.event.onceListeners];
      this.event.onceListeners.length = 0;

      for (let i = 0; i < currentOnceListeners.length; i++) {
        const listener = currentOnceListeners[i];
        if (!listener) continue;

        await executeAsyncHandler(listener, args, this.continueOnError, this.logErrors);
      }
    }
  },
};

// ===== Pre-created Prototype Objects =====

/**
 * Pre-created prototype for standard synchronous events
 */
export const monoProto = Object.create(null);
Object.assign(monoProto, baseEventMethods, syncEmitMethods);

/**
 * Pre-created prototype for restricted synchronous events
 */
export const monoRestrictEventProto = Object.create(null);
Object.assign(monoRestrictEventProto, baseEventMethods);

/**
 * Pre-created prototype for restricted synchronous event emitters
 */
export const monoRestrictEmitProto = Object.create(null);
Object.assign(monoRestrictEmitProto, restrictedSyncEmitMethods);

/**
 * Pre-created prototype for asynchronous events
 */
export const monoAsyncProto = Object.create(null);
Object.assign(monoAsyncProto, baseEventMethods, asyncEmitMethods);

/**
 * Pre-created prototype for restricted asynchronous events
 */
export const monoRestrictAsyncEventProto = Object.create(null);
Object.assign(monoRestrictAsyncEventProto, baseEventMethods);

/**
 * Pre-created prototype for restricted asynchronous event emitters
 */
export const monoRestrictAsyncEmitProto = Object.create(null);
Object.assign(monoRestrictAsyncEmitProto, restrictedAsyncEmitMethods);
