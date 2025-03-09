/**
 * Restricted synchronous event implementation
 */

import type { EventHandler, HandlerRegistration, MonoRestrictedEvent } from './types';
import { createHandlerRegistration, executeHandler, findHandlerIndex } from './utils';

/**
 * Creates a new restricted synchronous event with separated emission control
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
export function monoRestrict<T>(): {
  event: MonoRestrictedEvent<T>;
  emit: (args: T) => void;
} {
  const registrations: HandlerRegistration<T, EventHandler<T>>[] = [];

  const restrictedEvent = {
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
  };

  const emit = (args: T): void => {
    // Create a copy to handle removal during iteration
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
  };

  return {
    event: restrictedEvent as MonoRestrictedEvent<T>,
    emit,
  };
}
