/**
 * Restricted asynchronous event implementation
 */

import type { AsyncEventHandler, AsyncEventOptions, HandlerRegistration, MonoRestrictedAsyncEvent } from './types';
import { createHandlerRegistration, executeAsyncHandler, findHandlerIndex } from './utils';

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
export function monoRestrictAsync<T>(options: AsyncEventOptions = {}): {
  event: MonoRestrictedAsyncEvent<T>;
  emit: (args: T) => Promise<void>;
} {
  const registrations: HandlerRegistration<T, AsyncEventHandler<T>>[] = [];
  const { parallel = false } = options;

  const restrictedEvent = {
    add: (...args: unknown[]): (() => void) => {
      const registration = createHandlerRegistration<T, AsyncEventHandler<T>>(args);
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
          ? findHandlerIndex(registrations, args[0] as AsyncEventHandler<T>, undefined)
          : findHandlerIndex(registrations, args[0] as object, args[1] as AsyncEventHandler<T>);

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

  const emit = async (args: T): Promise<void> => {
    // Create a copy to handle removal during iteration
    const currentRegistrations = [...registrations];

    // Track 'once' handlers to remove after execution
    const toRemove: HandlerRegistration<T, AsyncEventHandler<T>>[] = [];

    if (parallel) {
      // Run all handlers in parallel
      const promises = currentRegistrations.map(async (registration) => {
        // Skip if already removed during this emit cycle
        if (!registrations.includes(registration)) return;

        await executeAsyncHandler(registration, args);

        if (registration.options.once) {
          toRemove.push(registration);
        }
      });

      await Promise.all(promises);
    } else {
      // Run handlers sequentially
      for (const registration of currentRegistrations) {
        // Skip if already removed during this emit cycle
        if (!registrations.includes(registration)) continue;

        await executeAsyncHandler(registration, args);

        if (registration.options.once) {
          toRemove.push(registration);
        }
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
    event: restrictedEvent as MonoRestrictedAsyncEvent<T>,
    emit,
  };
}
