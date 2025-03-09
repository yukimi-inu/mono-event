/**
 * Synchronous event implementation
 */

import type { EventHandler, HandlerRegistration, MonoEvent } from './types';
import { createHandlerRegistration, executeHandler, findHandlerIndex } from './utils';

/**
 * Creates a new synchronous event
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
export function mono<T>(): MonoEvent<T> {
  const registrations: HandlerRegistration<T, EventHandler<T>>[] = [];

  // Implementation with overloaded methods
  const event = {
    add: (...args: unknown[]): (() => void) => {
      const registration = createHandlerRegistration<T, EventHandler<T>>(args);
      registrations.push(registration);

      return () => {
        const index = registrations.indexOf(registration);
        if (index !== -1) {
          registrations.splice(index, 1);
        }
      };
    },

    remove: (...args: unknown[]): boolean => {
      const index =
        args.length === 1
          ? findHandlerIndex(registrations, args[0] as EventHandler<T>, undefined)
          : findHandlerIndex(registrations, args[0] as object, args[1] as EventHandler<T>);

      if (index !== -1) {
        registrations.splice(index, 1);
        return true;
      }
      return false;
    },

    removeAll: (): void => {
      registrations.length = 0;
    },

    emit: (args: T): void => {
      // Create a copy to handle removal during iteration (e.g., for once handlers)
      const currentRegistrations = [...registrations];

      // Track 'once' handlers to remove after execution
      const toRemove: HandlerRegistration<T, EventHandler<T>>[] = [];

      for (const registration of currentRegistrations) {
        // Skip if already removed during this emit cycle
        if (!registrations.includes(registration)) continue;

        executeHandler(registration, args);

        if (registration.options.once) {
          toRemove.push(registration);
        }
      }

      // Remove 'once' handlers
      for (const registration of toRemove) {
        const index = registrations.indexOf(registration);
        if (index !== -1) {
          registrations.splice(index, 1);
        }
      }
    },
  };

  return event as MonoEvent<T>;
}
