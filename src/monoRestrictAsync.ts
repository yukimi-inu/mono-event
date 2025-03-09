/**
 * Restricted asynchronous event implementation
 */

import type { AsyncEventOptions, Caller, EmitterOptions, EventOptions } from './types';
import type { AsyncEventHandler, MonoRestrictedAsyncEvent } from './types/async';

/**
 * Creates a new restricted asynchronous event with separated emission control
 * @param options Options for controlling async behavior
 * @returns An object with event and emit properties
 * @example
 * ```ts
 * const { event, emit } = monoRestrictAsync<number>();
 *
 * event.add(async (num) => {
 *   await new Promise((resolve) => setTimeout(resolve, 500));
 *   console.log("Async Restricted:", num);
 * });
 *
 * // With caller context
 * class AsyncReceiver {
 *   async process(num: number) {
 *     await new Promise((resolve) => setTimeout(resolve, 300));
 *     console.log("AsyncReceiver processed:", num);
 *   }
 * }
 * const receiver = new AsyncReceiver();
 * event.add(receiver, receiver.process);
 *
 * // One-time async listener
 * event.add(async (num) => {
 *   console.log("One-time async restricted:", num);
 * }, { once: true });
 *
 * await emit(123);
 * ```
 */
export function monoRestrictAsync<T>(options: AsyncEventOptions & EmitterOptions = {}): {
  event: MonoRestrictedAsyncEvent<T>;
  emit: (args: T) => Promise<void>;
} {
  // Set options
  const { parallel = false, continueOnError = false, logErrors = false } = options;
  
  // Use simple array for best performance
  const listeners: Array<{
    handler: AsyncEventHandler<T>;
    caller: Caller | null;
    once: boolean;
  }> = [];

  // Create the restricted event object
  const restrictedEvent = {
    add(...args: unknown[]): () => void {
      let handler: AsyncEventHandler<T>;
      let caller: Caller | null = null;
      let options: EventOptions = {};

      // Parse arguments inline
      if (typeof args[0] === 'function') {
        handler = args[0] as AsyncEventHandler<T>;
        options = (args[1] as EventOptions) || {};
      } else {
        caller = args[0] as Caller;
        handler = args[1] as AsyncEventHandler<T>;
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
        const handler = args[0] as AsyncEventHandler<T>;
        index = listeners.findIndex((l) => l.caller === null && l.handler === handler);
      } else {
        // Caller and handler case
        const caller = args[0] as Caller;
        const handler = args[1] as AsyncEventHandler<T>;
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
  const emit = async (args: T): Promise<void> => {
    if (parallel) {
      // Create a copy for iteration during removal
      const currentListeners = listeners.slice();
      
      // Track indexes to remove
      const toRemoveIndexes: number[] = [];
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        
        const promise = (async () => {
          try {
            // Use caller context if available
            if (listener.caller) {
              await listener.handler.call(listener.caller, args);
            } else {
              await listener.handler(args);
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
              console.error('Error in async event handler:', error);
            }
            
            // Stop processing if continueOnError is false
            if (!continueOnError) {
              throw error;
            }
          }
        })();
        
        promises.push(promise);
      }
      
      // Wait for all promises to complete
      await Promise.all(promises);
      
      // Sort indexes in descending order and remove from highest to lowest
      if (toRemoveIndexes.length > 0) {
        toRemoveIndexes.sort((a, b) => b - a);
        for (let i = 0; i < toRemoveIndexes.length; i++) {
          listeners.splice(toRemoveIndexes[i], 1);
        }
      }
    } else {
      // Sequential execution
      // Create a copy for iteration during removal
      const currentListeners = listeners.slice();
      
      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        
        try {
          // Use caller context if available
          if (listener.caller) {
            await listener.handler.call(listener.caller, args);
          } else {
            await listener.handler(args);
          }
          
          // Remove once listeners immediately
          if (listener.once) {
            const originalIndex = listeners.indexOf(listener);
            if (originalIndex !== -1) {
              listeners.splice(originalIndex, 1);
            }
          }
        } catch (error) {
          // Log errors if enabled
          if (logErrors) {
            console.error('Error in async event handler:', error);
          }
          
          // Stop processing if continueOnError is false
          if (!continueOnError) {
            throw error;
          }
        }
      }
    }
  };

  return {
    event: restrictedEvent as MonoRestrictedAsyncEvent<T>,
    emit,
  };
}
