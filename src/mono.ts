/**
 * Synchronous event implementation
 */

import type { EmitterOptions } from './types';
import type { MonoEvent } from './types/sync';
import { createEmitter, monoProto } from './utils';

/**
 * Creates a new synchronous event
 */
export function mono<T>(options: EmitterOptions = {}): MonoEvent<T> {
  // Set options with defaults
  const { continueOnError = false, logErrors = false } = options;

  // Create instance with shared methods
  const instance = Object.create(monoProto);

  // Add instance-specific properties (listeners are lazily initialized)
  instance.listeners = null;
  instance.onceListeners = null;
  instance.continueOnError = continueOnError;
  instance.logErrors = logErrors;

  // Define emitter property with getter for lazy initialization
  Object.defineProperty(instance, 'emitter', {
    get: function() {
      if (!this._emitterCache) {
        this._emitterCache = createEmitter<T, MonoEvent<T>>(this);
      }
      return this._emitterCache;
    },
    enumerable: true,
    configurable: false
  });

  return instance as MonoEvent<T>;
}
