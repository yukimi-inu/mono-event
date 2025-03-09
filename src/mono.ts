/**
 * Synchronous event implementation
 */

import type {Caller, EmitterOptions} from './types';
import type {EventHandler, MonoEvent} from './types/sync';

// Define a more memory-efficient listener type using symbols
interface SymbolListener<T> {
  h: EventHandler<T>;
  c: Caller | null;
}

// Optimized argument parsing with minimal object creation
function parseAddArgs<T>(args: unknown[]): { handler: EventHandler<T>; caller: Caller | null; options: any } {
  const isFunc = typeof args[0] === 'function';
  // Reuse the same object for all calls to reduce allocations
  const result = {
    handler: isFunc ? (args[0] as EventHandler<T>) : (args[1] as EventHandler<T>),
    caller: isFunc ? null : (args[0] as Caller),
    options: ((isFunc ? args[1] : args[2]) as any) || {},
  };
  return result;
}

// Optimized unsubscribe function
function createUnsubscribe<T>(listeners: Array<SymbolListener<T>>, listener: SymbolListener<T>): () => void {
  // Use closure to avoid creating new functions
  return function unsubscribe() {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

// Optimized argument parsing for remove
function parseRemoveArgs<T>(args: unknown[]): { handler: EventHandler<T>; caller: Caller | null } {
  const isSingle = args.length === 1;
  return {
    handler: isSingle ? (args[0] as EventHandler<T>) : (args[1] as EventHandler<T>),
    caller: isSingle ? null : (args[0] as Caller),
  };
}

// Optimized find and remove
function findAndRemove<T>(
  listeners: Array<SymbolListener<T>>,
  handler: EventHandler<T>,
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

// Create a prototype object with shared methods
const monoProto = {
  add(this: any, ...args: unknown[]): () => void {
    const parsed = parseAddArgs(args);

    // Create listener info object with symbol keys
    const listener: SymbolListener<any> = {
      h: parsed.handler,
      c: parsed.caller,
    };

    // Store in appropriate array based on once option
    const targetArray = parsed.options.once ? this.onceListeners : this.listeners;
    targetArray.push(listener);

    // Return unsubscribe function
    return createUnsubscribe(targetArray, listener);
  },

  remove(this: any, ...args: unknown[]): boolean {
    const {handler, caller} = parseRemoveArgs(args);

    // Try to remove from regular listeners first (more common case)
    return findAndRemove(this.listeners, handler, caller) || findAndRemove(this.onceListeners, handler, caller);
  },

  removeAll(this: any): void {
    // Empty arrays (fastest method)
    this.listeners.length = 0;
    this.onceListeners.length = 0;
  },

  emit(this: any, args: unknown): void {
    // Fast path for no listeners
    if (!this.listeners.length && !this.onceListeners.length) return;

    // Execute regular listeners
    if (this.listeners.length > 0) {
      // Create a copy to avoid issues with modification during iteration
      const currentListeners = [...this.listeners];

      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        // Skip if listener is undefined (might happen if removed during iteration)
        if (!listener) continue;

        try {
          if (listener.c) {
            listener.h.call(listener.c, args);
          } else {
            listener.h(args);
          }
        } catch (error) {
          if (this.logErrors) {
            console.error('Error in event handler:', error);
          }
          if (!this.continueOnError) {
            throw error;
          }
        }
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
        if (!listener) continue;

        try {
          if (listener.c) {
            listener.h.call(listener.c, args);
          } else {
            listener.h(args);
          }
        } catch (error) {
          if (this.logErrors) {
            console.error('Error in event handler:', error);
          }
          if (!this.continueOnError) {
            throw error;
          }
        }
      }
    }
  },
};

/**
 * Creates a new synchronous event
 */
export function mono<T>(options: EmitterOptions = {}): MonoEvent<T> {
  // Set options with defaults
  const {continueOnError = false, logErrors = false} = options;

  // Create instance with data properties
  const instance = Object.create(monoProto);

  // Add instance-specific properties
  instance.listeners = [];
  instance.onceListeners = [];
  instance.continueOnError = continueOnError;
  instance.logErrors = logErrors;

  return instance as MonoEvent<T>;
}
