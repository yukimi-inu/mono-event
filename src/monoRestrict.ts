/**
 * Restricted synchronous event implementation
 */

import type { EmitterOptions } from './types';
import type { EventHandler, MonoRestrictedEvent } from './types/sync';
import type { ListenerInfo } from './utils';
import {
  parseAddArgs,
  createUnsubscribe,
  parseRemoveArgs,
  findAndRemove,
  executeHandler,
  removeOnceListeners
} from './utils';

/**
 * Creates a new restricted synchronous event with separated emission control
 */
export function monoRestrict<T>(options: EmitterOptions = {}): {
  event: MonoRestrictedEvent<T>;
  emit: (args: T) => void;
} {
  // Set options with defaults
  const { continueOnError = false, logErrors = false } = options;
  
  // Use simple array for best performance
  const listeners: Array<ListenerInfo<EventHandler<T>>> = [];

  // Create the restricted event object with optimized methods
  const restrictedEvent = {
    add(...args: unknown[]): () => void {
      const parsed = parseAddArgs<EventHandler<T>>(args);
      
      // Store listener info
      const listenerInfo: ListenerInfo<EventHandler<T>> = {
        handler: parsed.handler,
        caller: parsed.caller,
        once: !!parsed.options.once,
      };

      listeners.push(listenerInfo);

      // Return unsubscribe function
      return createUnsubscribe(listeners, listenerInfo);
    },

    remove(...args: unknown[]): boolean {
      const { handler, caller } = parseRemoveArgs<EventHandler<T>>(args);
      return findAndRemove(listeners, handler, caller);
    },

    removeAll(): void {
      // Empty array (fastest method)
      listeners.length = 0;
    },
  };

  // Create the emit function with optimizations
  const emit = (args: T): void => {
    // Fast path for no listeners
    if (!listeners.length) return;
    
    // Create a copy to avoid issues with modification during iteration
    const currentListeners = [...listeners];
    
    // Track indexes to remove
    const toRemoveIndexes: number[] = [];
    let hasOnce = false;
    
    for (let i = 0; i < currentListeners.length; i++) {
      const listener = currentListeners[i];
      // Skip if listener is undefined (might happen if removed during iteration)
      if (!listener) continue;
      
      try {
        if (listener.caller) {
          listener.handler.call(listener.caller, args);
        } else {
          listener.handler(args);
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
          console.error('Error in event handler:', error);
        }
        if (!continueOnError) {
          throw error;
        }
      }
    }
    
    // Remove once listeners only if needed
    if (hasOnce) {
      removeOnceListeners(listeners, toRemoveIndexes);
    }
  };

  return {
    event: restrictedEvent as MonoRestrictedEvent<T>,
    emit,
  };
}
