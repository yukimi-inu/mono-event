/**
 * Restricted asynchronous event implementation
 */

import type { AsyncEventOptions, EmitterOptions } from './types';
import type { AsyncEventHandler, MonoRestrictedAsyncEvent } from './types/async';
import type { ListenerInfo } from './utils';
import {
  parseAddArgs,
  createUnsubscribe,
  parseRemoveArgs,
  findAndRemove,
  removeOnceListeners
} from './utils';

/**
 * Creates a new restricted asynchronous event with separated emission control
 */
export function monoRestrictAsync<T>(options: AsyncEventOptions & EmitterOptions = {}): {
  event: MonoRestrictedAsyncEvent<T>;
  emit: (args: T) => Promise<void>;
} {
  // Set options with defaults
  const { parallel = false, continueOnError = false, logErrors = false } = options;
  
  // Use simple array for best performance
  const listeners: Array<ListenerInfo<AsyncEventHandler<T>>> = [];

  // Create the restricted event object with optimized methods
  const restrictedEvent = {
    add(...args: unknown[]): () => void {
      const parsed = parseAddArgs<AsyncEventHandler<T>>(args);
      
      // Store listener info
      const listenerInfo: ListenerInfo<AsyncEventHandler<T>> = {
        handler: parsed.handler,
        caller: parsed.caller,
        once: !!parsed.options.once,
      };

      listeners.push(listenerInfo);

      // Return unsubscribe function
      return createUnsubscribe(listeners, listenerInfo);
    },

    remove(...args: unknown[]): boolean {
      const { handler, caller } = parseRemoveArgs<AsyncEventHandler<T>>(args);
      return findAndRemove(listeners, handler, caller);
    },

    removeAll(): void {
      // Empty array (fastest method)
      listeners.length = 0;
    },
  };

  // Create the emit function with optimizations
  const emit = async (args: T): Promise<void> => {
    // Fast path for no listeners
    if (!listeners.length) return;
    
    if (parallel) {
      // Parallel execution
      // Create a copy to avoid issues with modification during iteration
      const currentListeners = [...listeners];
      
      // Track indexes to remove
      const toRemoveIndexes: number[] = [];
      const promises: Promise<void>[] = [];
      let hasOnce = false;
      
      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        // Skip if listener is undefined
        if (!listener) continue;
        
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
              hasOnce = true;
              const originalIndex = listeners.indexOf(listener);
              if (originalIndex !== -1) {
                toRemoveIndexes.push(originalIndex);
              }
            }
          } catch (error) {
            if (logErrors) {
              console.error('Error in async event handler:', error);
            }
            if (!continueOnError) {
              throw error;
            }
          }
        })();
        
        promises.push(promise);
      }
      
      // Wait for all promises to complete
      await Promise.all(promises);
      
      // Remove once listeners only if needed
      if (hasOnce) {
        removeOnceListeners(listeners, toRemoveIndexes);
      }
    } else {
      // Sequential execution
      // Create a copy to avoid issues with modification during iteration
      const currentListeners = [...listeners];
      
      for (let i = 0; i < currentListeners.length; i++) {
        const listener = currentListeners[i];
        // Skip if listener is undefined
        if (!listener) continue;
        
        try {
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
          if (logErrors) {
            console.error('Error in async event handler:', error);
          }
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
