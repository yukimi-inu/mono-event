/**
 * Asynchronous event implementation
 */

import type { AsyncEventOptions, EmitterOptions } from './types';
import type { MonoAsyncEvent } from './types/async';
import { createEmitter, monoAsyncProto } from './utils';

/**
 * Creates a new asynchronous event
 */
export function monoAsync<T>(options: AsyncEventOptions & EmitterOptions = {}): MonoAsyncEvent<T> {
  // Set options with defaults
  const { parallel = false, continueOnError = false, logErrors = false } = options;

  // Create instance with shared methods
  const instance = Object.create(monoAsyncProto);

  // Add instance-specific properties (listeners are lazily initialized)
  instance.listeners = null;
  instance.onceListeners = null;
  instance.parallel = parallel;
  instance.continueOnError = continueOnError;
  instance.logErrors = logErrors;

  // Define emitter property with getter for lazy initialization
  Object.defineProperty(instance, 'emitter', {
    get: function() {
      if (!this._emitterCache) {
        this._emitterCache = createEmitter<T, MonoAsyncEvent<T>>(this);
      }
      return this._emitterCache;
    },
    enumerable: true,
    configurable: false
  });

  return instance as MonoAsyncEvent<T>;
}
