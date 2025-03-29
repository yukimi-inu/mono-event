/**
 * Restricted asynchronous event implementation
 */

import type {AsyncEventOptions, EmitterOptions} from './types';
import type {MonoRestrictedAsyncEvent} from './types/async';
import {monoRestrictAsyncEmitProto, monoRestrictAsyncEventProto} from './utils';

/**
 * Creates a new restricted asynchronous event with separated emission control
 */
export function monoRestrictAsync<T>(options: AsyncEventOptions & EmitterOptions = {}): {
  event: MonoRestrictedAsyncEvent<T>;
  emit: (args: T) => Promise<void>;
} {
  // Set options with defaults
  const {parallel = false, continueOnError = false, logErrors = false} = options;

  // Create event instance with shared methods
  const eventInstance = Object.create(monoRestrictAsyncEventProto);

  // Add instance-specific properties to eventInstance (listeners are lazily initialized)
  eventInstance.listeners = null;
  eventInstance.onceListeners = null;

  // Create emit instance with shared methods
  const emitInstance = Object.create(monoRestrictAsyncEmitProto);

  // Add instance-specific properties to emitInstance
  emitInstance.event = eventInstance;
  emitInstance.parallel = parallel;
  emitInstance.continueOnError = continueOnError;
  emitInstance.logErrors = logErrors;

  return {
    event: eventInstance as MonoRestrictedAsyncEvent<T>,
    emit: emitInstance.emit.bind(emitInstance) as (args: T) => Promise<void>,
  };
}
