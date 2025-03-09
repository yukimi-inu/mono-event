/**
 * Shared utilities for mono-event implementations
 */

import type { Caller, EventOptions, GenericFunction } from './types';
import type { EventHandler } from './types/sync';
import type { AsyncEventHandler } from './types/async';

/**
 * Listener information structure
 */
export interface ListenerInfo<H extends GenericFunction> {
  handler: H;
  caller: Caller | null;
  once: boolean;
}

// Optimized argument parsing with minimal object creation
export function parseAddArgs<H extends GenericFunction>(
  args: unknown[]
): { handler: H; caller: Caller | null; options: EventOptions } {
  const isFunc = typeof args[0] === 'function';
  // Reuse the same object for all calls to reduce allocations
  const result = {
    handler: isFunc ? args[0] as H : args[1] as H,
    caller: isFunc ? null : args[0] as Caller,
    options: (isFunc ? args[1] : args[2]) as EventOptions || {}
  };
  return result;
}

// Optimized unsubscribe function
export function createUnsubscribe<H extends GenericFunction>(
  listeners: Array<ListenerInfo<H>>,
  listenerInfo: ListenerInfo<H>
): () => void {
  // Use closure to avoid creating new functions
  return function unsubscribe() {
    const index = listeners.indexOf(listenerInfo);
    if (index !== -1) listeners.splice(index, 1);
  };
}

// Optimized argument parsing for remove
export function parseRemoveArgs<H extends GenericFunction>(
  args: unknown[]
): { handler: H; caller: Caller | null } {
  const isSingle = args.length === 1;
  return {
    handler: isSingle ? args[0] as H : args[1] as H,
    caller: isSingle ? null : args[0] as Caller
  };
}

// Optimized find and remove
export function findAndRemove<H extends GenericFunction>(
  listeners: Array<ListenerInfo<H>>,
  handler: H,
  caller: Caller | null
): boolean {
  for (let i = 0; i < listeners.length; i++) {
    const l = listeners[i];
    if (l.caller === caller && l.handler === handler) {
      listeners.splice(i, 1);
      return true;
    }
  }
  return false;
}

// Optimized handler execution
export function executeHandler<T>(
  listener: ListenerInfo<(args: T) => any> | undefined,
  args: T,
  continueOnError: boolean,
  logErrors: boolean
): any {
  // Skip if listener is undefined (might happen if removed during iteration)
  if (!listener) return;
  
  try {
    return listener.caller
      ? listener.handler.call(listener.caller, args)
      : listener.handler(args);
  } catch (error) {
    if (logErrors) console.error('Error in event handler:', error);
    if (!continueOnError) throw error;
  }
}

// These functions are no longer needed as we're using the once property directly

// Optimized once listener removal
export function removeOnceListeners<H extends GenericFunction>(
  listeners: Array<ListenerInfo<H>>,
  toRemoveIndexes: number[]
): void {
  if (!toRemoveIndexes.length) return;
  
  // Sort in descending order to avoid index shifting issues
  toRemoveIndexes.sort((a, b) => b - a);
  
  // Remove from highest to lowest index
  for (let i = 0; i < toRemoveIndexes.length; i++) {
    listeners.splice(toRemoveIndexes[i], 1);
  }
}

// ===== Shared Methods for Memory Optimization =====

/**
 * Shared methods for synchronous events
 */
export const sharedSyncMethods = {
  // Shared add method
  add<T>(
    listeners: Array<ListenerInfo<EventHandler<T>>>,
    onceListeners: Array<ListenerInfo<EventHandler<T>>>,
    ...args: unknown[]
  ): () => void {
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

  // Shared remove method
  remove<T>(
    listeners: Array<ListenerInfo<EventHandler<T>>>,
    onceListeners: Array<ListenerInfo<EventHandler<T>>>,
    ...args: unknown[]
  ): boolean {
    const { handler, caller } = parseRemoveArgs<EventHandler<T>>(args);
    
    // Try to remove from regular listeners first (more common case)
    return findAndRemove(listeners, handler, caller) ||
           findAndRemove(onceListeners, handler, caller);
  },

  // Shared removeAll method
  removeAll<T>(
    listeners: Array<ListenerInfo<EventHandler<T>>>,
    onceListeners: Array<ListenerInfo<EventHandler<T>>>
  ): void {
    // Empty arrays (fastest method)
    listeners.length = 0;
    onceListeners.length = 0;
  },

  // Shared emit method
  emit<T>(
    listeners: Array<ListenerInfo<EventHandler<T>>>,
    onceListeners: Array<ListenerInfo<EventHandler<T>>>,
    args: T,
    continueOnError: boolean,
    logErrors: boolean
  ): void {
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

/**
 * Shared methods for asynchronous events
 */
export const sharedAsyncMethods = {
  // Shared add method
  add<T>(
    listeners: Array<ListenerInfo<AsyncEventHandler<T>>>,
    ...args: unknown[]
  ): () => void {
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

  // Shared remove method
  remove<T>(
    listeners: Array<ListenerInfo<AsyncEventHandler<T>>>,
    ...args: unknown[]
  ): boolean {
    const { handler, caller } = parseRemoveArgs<AsyncEventHandler<T>>(args);
    return findAndRemove(listeners, handler, caller);
  },

  // Shared removeAll method
  removeAll<T>(
    listeners: Array<ListenerInfo<AsyncEventHandler<T>>>
  ): void {
    // Empty array (fastest method)
    listeners.length = 0;
  }
};