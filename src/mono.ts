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
  
  // Store once listeners separately for faster access during emit
  const onceListeners: Array<{
    handler: EventHandler<T>;
    caller: Caller | null;
  }> = [];
  
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

      // Check if it's a once listener
      const isOnce = !!options.once;
      
      if (isOnce) {
        // Store once listener separately
        const onceListener = {
          handler,
          caller
        };
        onceListeners.push(onceListener);
        
        // Return unsubscribe function
        return () => {
          const index = onceListeners.indexOf(onceListener);
          if (index !== -1) {
            onceListeners.splice(index, 1);
          }
        };
      }
      
      // Store regular listener
      const listenerInfo = {
        handler,
        caller,
        once: false
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
      let handler: EventHandler<T>;
      let caller: Caller | null = null;
      
      if (args.length === 1) {
        // Handler only case
        handler = args[0] as EventHandler<T>;
        caller = null;
      } else {
        // Caller and handler case
        caller = args[0] as Caller;
        handler = args[1] as EventHandler<T>;
      }
      
      // Try to remove from regular listeners
      const regularIndex = listeners.findIndex(
        (l) => l.caller === caller && l.handler === handler
      );
      
      if (regularIndex !== -1) {
        listeners.splice(regularIndex, 1);
        return true;
      }
      
      // Try to remove from once listeners
      const onceIndex = onceListeners.findIndex(
        (l) => l.caller === caller && l.handler === handler
      );
      
      if (onceIndex !== -1) {
        onceListeners.splice(onceIndex, 1);
        return true;
      }
      
      return false;
    },

    removeAll(): void {
      // Empty arrays (fastest method)
      listeners.length = 0;
      onceListeners.length = 0;
    },

    emit(args: T): void {
      // Execute regular listeners
      // Create a copy to avoid issues with modification during iteration
      const currentListeners = [...listeners];
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
      
      // Execute once listeners and clear them
      if (onceListeners.length > 0) {
        // Create a copy of once listeners
        const currentOnceListeners = [...onceListeners];
        
        // Clear the once listeners array immediately
        onceListeners.length = 0;
        
        // Execute the once listeners
        for (let i = 0; i < currentOnceListeners.length; i++) {
          const listener = currentOnceListeners[i];
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
}
