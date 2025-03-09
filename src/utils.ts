/**
 * Utility functions for mono-event
 */

import type {
  AsyncEventHandler,
  Caller,
  EventHandler,
  EventOptions,
  GenericFunction,
  HandlerRegistration,
} from './types';

/**
 * Creates a handler registration based on the provided arguments
 */
export function createHandlerRegistration<T, H extends GenericFunction>(args: unknown[]): HandlerRegistration<T, H> {
  // Case: add(handler, options?)
  if (typeof args[0] === 'function') {
    return {
      caller: null,
      handler: args[0] as H,
      options: (args[1] as EventOptions) || {},
    };
  }
  // Case: add(caller, handler, options?)

  return {
    caller: args[0] as Caller,
    handler: args[1] as H,
    options: (args[2] as EventOptions) || {},
  };
}

/**
 * Executes a handler with the appropriate caller context
 */
export function executeHandler<T>(registration: HandlerRegistration<T, EventHandler<T>>, args: T): void {
  try {
    if (registration.caller) {
      registration.handler.call(registration.caller, args);
    } else {
      registration.handler(args);
    }
  } catch (error) {
    console.error('Error in event handler:', error);
  }
}

/**
 * Executes an async handler with the appropriate caller context
 */
export async function executeAsyncHandler<T>(
  registration: HandlerRegistration<T, AsyncEventHandler<T>>,
  args: T,
): Promise<void> {
  try {
    let result: unknown;
    if (registration.caller) {
      result = registration.handler.call(registration.caller, args);
    } else {
      result = registration.handler(args);
    }
    await Promise.resolve(result);
  } catch (error) {
    console.error('Error in async event handler:', error);
  }
}

/**
 * Finds a handler in the registrations array
 */
export function findHandlerIndex<T, H extends GenericFunction>(
  registrations: HandlerRegistration<T, H>[],
  callerOrHandler: H | Caller,
  maybeHandler?: H,
): number {
  if (maybeHandler === undefined) {
    // Looking for a standalone handler
    return registrations.findIndex((reg) => reg.caller === null && reg.handler === callerOrHandler);
  }
  // Looking for a caller+handler pair
  return registrations.findIndex((reg) => reg.caller === callerOrHandler && reg.handler === maybeHandler);
}
