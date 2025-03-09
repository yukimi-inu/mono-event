/**
 * Restricted synchronous event implementation
 */

import type { Caller, EmitterOptions, EventOptions } from './types';
import type { EventHandler, MonoRestrictedEvent } from './types/sync';

/**
 * Creates a new restricted synchronous event with separated emission control
 * @param options Options for the event emitter
 * @returns An object with event and emit properties
 * @example
 * ```ts
 * const { event, emit } = monoRestrict<string>();
 *
 * // External code can register listeners using event.add()
 * event.add((msg) => {
 *   console.log("Restricted Received:", msg);
 * });
 *
 * // With caller context
 * class Receiver {
 *   handleMessage(msg: string) {
 *     console.log("Receiver got:", msg);
 *   }
 * }
 * const receiver = new Receiver();
 * event.add(receiver, receiver.handleMessage);
 *
 * // One-time listener
 * event.add((msg) => {
 *   console.log("One-time restricted:", msg);
 * }, { once: true });
 *
 * // Emission is performed via the emit() function
 * emit("Restricted Hello");
 * ```
 */
export function monoRestrict<T>(options: EmitterOptions = {}): {
  event: MonoRestrictedEvent<T>;
  emit: (args: T) => void;
} {
  // Set options
  const { continueOnError = false, logErrors = false } = options;
  
  // Use simple array for best performance
  const listeners: Array<{
    handler: EventHandler<T>;
    caller: Caller | null;
    once: boolean;
  }> = [];

  // Create the restricted event object
  const restrictedEvent = {
    add(...args: unknown[]): () => void {
      let handler: EventHandler<T>;
      let caller: Caller | null = null;
      let options: EventOptions = {};

      // Parse arguments inline
      if (typeof args[0] === 'function') {
        handler = args[0] as EventHandler<T>;
        options = (args[1] as EventOptions) || {};
      } else {
        caller = args[0] as Caller;
        handler = args[1] as EventHandler<T>;
        options = (args[2] as EventOptions) || {};
      }

      // Store listener info
      const listenerInfo = {
        handler,
        caller,
        once: !!options.once,
      };

      listeners.push(listenerInfo);

      // Return unsubscribe function
      return () => {
        const index = listeners.indexOf(listenerInfo);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    remove(...args: unknown[]): boolean {
      let index = -1;

      if (args.length === 1) {
        // Handler only case
        const handler = args[0] as EventHandler<T>;
        index = listeners.findIndex((l) => l.caller === null && l.handler === handler);
      } else {
        // Caller and handler case
        const caller = args[0] as Caller;
        const handler = args[1] as EventHandler<T>;
        index = listeners.findIndex((l) => l.caller === caller && l.handler === handler);
      }

      if (index !== -1) {
        listeners.splice(index, 1);
        return true;
      }
      return false;
    },

    removeAll(): void {
      // Empty array (fastest method)
      listeners.length = 0;
    },
  };

  // Create the emit function
  const emit = (args: T): void => {
    // Create a copy for iteration during removal
    const currentListeners = listeners.slice();
    
    // Track indexes to remove
    const toRemoveIndexes: number[] = [];
    
    for (let i = 0; i < currentListeners.length; i++) {
      const listener = currentListeners[i];
      
      try {
        // Use caller context if available
        if (listener.caller) {
          listener.handler.call(listener.caller, args);
        } else {
          listener.handler(args);
        }
        
        // Record index for once listeners
        if (listener.once) {
          const originalIndex = listeners.indexOf(listener);
          if (originalIndex !== -1) {
            toRemoveIndexes.push(originalIndex);
          }
        }
      } catch (error) {
        // Log errors if enabled
        if (logErrors) {
          console.error('Error in event handler:', error);
        }
        
        // Stop processing if continueOnError is false
        if (!continueOnError) {
          throw error;
        }
      }
    }
    
    // Sort indexes in descending order and remove from highest to lowest
    if (toRemoveIndexes.length > 0) {
      toRemoveIndexes.sort((a, b) => b - a);
      for (let i = 0; i < toRemoveIndexes.length; i++) {
        listeners.splice(toRemoveIndexes[i], 1);
      }
    }
  };

  return {
    event: restrictedEvent as MonoRestrictedEvent<T>,
    emit,
  };
}
