/**
 * Asynchronous event implementation
 */

import type {AsyncEventOptions, EmitterOptions} from './types';
import type {MonoAsyncEvent} from './types/async';
import {monoAsyncProto} from './utils';

/**
 * Creates a new asynchronous event
 */
export function monoAsync<T>(options: AsyncEventOptions & EmitterOptions = {}): MonoAsyncEvent<T> {
  // Set options with defaults
  const {parallel = false, continueOnError = false, logErrors = false} = options;

  // Create instance with shared methods
  const instance = Object.create(monoAsyncProto);

  // Add instance-specific properties
  instance.listeners = [];
  instance.onceListeners = [];
  instance.parallel = parallel;
  instance.continueOnError = continueOnError;
  instance.logErrors = logErrors;

  return instance as MonoAsyncEvent<T>;
}
