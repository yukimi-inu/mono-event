/**
 * Asynchronous event implementation
 */

import type { AsyncEventHandler, AsyncEventOptions, HandlerRegistration, MonoAsyncEvent } from './types';
import { createHandlerRegistration, executeAsyncHandler, findHandlerIndex } from './utils';

/**
 * Creates a new asynchronous event
 * @param options Options for controlling async behavior
 * @returns An async event object with add, remove, removeAll, and emit methods
 * @example
 * ```ts
 * const asyncEvent = monoAsync<number>();
 *
 * // Register an async listener
 * asyncEvent.add(async (num) => {
 *   await new Promise((resolve) => setTimeout(resolve, 1000));
 *   console.log("Processed:", num);
 * });
 *
 * // Register with a caller context
 * class AsyncProcessor {
 *   async process(num: number) {
 *     await new Promise((resolve) => setTimeout(resolve, 500));
 *     console.log("Processor received:", num);
 *   }
 * }
 * const processor = new AsyncProcessor();
 * asyncEvent.add(processor, processor.process);
 *
 * // Register a one-time listener
 * asyncEvent.add(async (num) => {
 *   console.log("One-time async:", num);
 * }, { once: true });
 *
 * // Emit an event and wait for all listeners to finish
 * await asyncEvent.emit(42);
 *
 * // Using parallel execution
 * const asyncEventParallel = monoAsync<number>({ parallel: true });
 * ```
 */
export function monoAsync<T>(options: AsyncEventOptions = {}): MonoAsyncEvent<T> {
  const registrations: HandlerRegistration<T, AsyncEventHandler<T>>[] = [];
  const { parallel = false } = options;

  const event = {
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

    emit: async (args: T): Promise<void> => {
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
    },
  };

  return event as MonoAsyncEvent<T>;
}
