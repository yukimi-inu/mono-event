/**
 * Synchronous event implementation
 */

import type {Caller, EmitterOptions, EventOptions} from './types';
import type {EventHandler, MonoEvent} from './types/sync';

/**
 * Creates a new synchronous event
 * @param options Options for the event emitter
 * @returns An event object with add, remove, removeAll, and emit methods
 * @example
 * ```ts
 * const event = mono<string>();
 *
 * // Register a listener (returns an unsubscribe function)
 * const unsubscribe = event.add((msg) => {
 *   console.log("Received:", msg);
 * });
 *
 * // Or register with a caller context
 * class MyClass {
 *   handleEvent(msg: string) {
 *     console.log("MyClass received:", msg);
 *   }
 * }
 * const instance = new MyClass();
 * event.add(instance, instance.handleEvent);
 *
 * // Register a one-time listener
 * event.add((msg) => {
 *   console.log("One-time:", msg);
 * }, { once: true });
 *
 * // Emit an event
 * event.emit("Hello, world!");
 *
 * // Unsubscribe when needed
 * unsubscribe();
 * // Or remove by reference
 * event.remove(instance, instance.handleEvent);
 *
 * // Remove all listeners
 * event.removeAll();
 * ```
 */
export function mono<T>(options: EmitterOptions = {}): MonoEvent<T> {
  // Set options
  const {continueOnError = false, logErrors = false} = options;

  // Use simple array for best performance
  const listeners: Array<{
    handler: EventHandler<T>;
    caller: Caller | null;
    once: boolean;
  }> = [];
  
  // We'll track once listeners directly in the listeners array
  // without using a separate Set for indices

  // Return object directly to avoid spread operator and function calls
  return {
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

      // Add to listeners array
      const index = listeners.length;
      listeners.push(listenerInfo);
      
      // If it's a once listener, store its index
      if (listenerInfo.once) {
        onceIndices.add(index);
      }

      // Return unsubscribe function
      return () => {
        const index = listeners.indexOf(listenerInfo);
        if (index !== -1) {
          listeners.splice(index, 1);
          updateOnceIndices(index);
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
        updateOnceIndices(index);
        return true;
      }
      return false;
    },

    removeAll(): void {
      // Empty array (fastest method)
      listeners.length = 0;
      // Clear once indices
      onceIndices.clear();
    },

    emit(args: T): void {
      // Create a copy of listeners to avoid issues with modification during iteration
      const currentListeners = [...listeners];
      
      // Get a copy of once indices and convert to array for easier sorting
      const onceIndicesToRemove = Array.from(onceIndices);
      
      // Execute all listeners
      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        
        try {
          if (listener.caller) {
            listener.handler.call(listener.caller, args);
          } else {
            listener.handler(args);
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
      
      // Remove once listeners in reverse order of their indices
      if (onceIndicesToRemove.length > 0) {
        // Sort by index in descending order
        onceIndicesToRemove.sort((a, b) => b - a);
        
        // Remove once listeners and update indices
        for (const index of onceIndicesToRemove) {
          listeners.splice(index, 1);
          onceIndices.delete(index);
        }
        
        // Update remaining once indices
        const newOnceIndices: Set<number> = new Set();
        for (const index of onceIndices) {
          let newIndex = index;
          // For each removed index, decrement the current index if it's greater
          for (const removedIndex of onceIndicesToRemove) {
            if (index > removedIndex) {
              newIndex--;
            }
          }
          newOnceIndices.add(newIndex);
        }
        
        // Replace the old set with the updated one
        onceIndices.clear();
        for (const index of newOnceIndices) {
          onceIndices.add(index);
        }
      }

      // // Create a copy for iteration during removal
      // const currentListeners = listeners.slice();
      //
      // // Track indexes to remove
      // const toRemoveIndexes: number[] = [];
      //
      // for (let i = 0; i < currentListeners.length; i++) {
      //   const listener = currentListeners[i];
      //
      //   try {
      //     // Use caller context if available
      //     if (listener.caller) {
      //       listener.handler.call(listener.caller, args);
      //     } else {
      //       listener.handler(args);
      //     }
      //
      //     // Record index for once listeners
      //     if (listener.once) {
      //       const originalIndex = listeners.indexOf(listener);
      //       if (originalIndex !== -1) {
      //         toRemoveIndexes.push(originalIndex);
      //       }
      //     }
      //   } catch (error) {
      //     // Log errors if enabled
      //     if (logErrors) {
      //       console.error('Error in event handler:', error);
      //     }
      //
      //     // Stop processing if continueOnError is false
      //     if (!continueOnError) {
      //       throw error;
      //     }
      //   }
      // }
      //
      // // Sort indexes in descending order and remove from highest to lowest
      // if (toRemoveIndexes.length > 0) {
      //   toRemoveIndexes.sort((a, b) => b - a);
      //   for (let i = 0; i < toRemoveIndexes.length; i++) {
      //     listeners.splice(toRemoveIndexes[i], 1);
      //   }
      // }
    },
  };
}
