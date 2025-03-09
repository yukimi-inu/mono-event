/**
 * Synchronous event implementation
 */

import type { EmitterOptions } from './types';
import type { EventHandler, MonoEvent } from './types/sync';
import type { ListenerInfo } from './utils';
import {
  parseAddArgs,
  createUnsubscribe,
  parseRemoveArgs,
  findAndRemove,
  executeHandler
} from './utils';

/**
 * Creates a new synchronous event
 */
export function mono<T>(options: EmitterOptions = {}): MonoEvent<T> {
  // Set options with defaults
  const { continueOnError = false, logErrors = false } = options;

  // Use simple array for best performance
  const listeners: Array<ListenerInfo<EventHandler<T>>> = [];
  
  // Store once listeners separately for faster access during emit
  const onceListeners: Array<ListenerInfo<EventHandler<T>>> = [];
  
  // Create event object with optimized methods
  const eventObj = {
    add(...args: unknown[]): () => void {
      const parsed = parseAddArgs<EventHandler<T>>(args);
      const isOnce = !!parsed.options.once;
      
      // Create listener info object
      const listenerInfo: ListenerInfo<EventHandler<T>> = {
        handler: parsed.handler,
        caller: parsed.caller,
        once: isOnce
      };
      
      // Store in appropriate array
      const targetArray = isOnce ? onceListeners : listeners;
      targetArray.push(listenerInfo);
      
      // Return unsubscribe function
      return createUnsubscribe(targetArray, listenerInfo);
    },

    remove(...args: unknown[]): boolean {
      const { handler, caller } = parseRemoveArgs<EventHandler<T>>(args);
      
      // Try to remove from regular listeners first (more common case)
      return findAndRemove(listeners, handler, caller) ||
             findAndRemove(onceListeners, handler, caller);
    },

    removeAll(): void {
      // Empty arrays (fastest method)
      listeners.length = 0;
      onceListeners.length = 0;
    },

    emit(args: T): void {
      // Fast path for no listeners
      if (!listeners.length && !onceListeners.length) return;
      
      // Execute regular listeners
      if (listeners.length > 0) {
        // Create a copy to avoid issues with modification during iteration
        const currentListeners = [...listeners];
        
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
          } catch (error) {
            if (logErrors) {
              console.error('Error in event handler:', error);
            }
            if (!continueOnError) {
              throw error;
            }
          }
        }
      }
      
      // Execute once listeners and clear them
      if (onceListeners.length > 0) {
        // Create a copy of once listeners
        const currentOnceListeners = [...onceListeners];
        
        // Clear the once listeners array immediately
        onceListeners.length = 0;
        
        // Execute the once listeners
        for (let i = 0; i < currentOnceListeners.length; i++) {
          const listener = currentOnceListeners[i];
          if (!listener) continue;
          
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
      }
    }
  };
  
  return eventObj;
}
