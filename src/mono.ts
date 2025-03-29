/**
 * Synchronous event implementation
 */

import type {EmitterOptions} from './types';
import type {MonoEvent} from './types/sync';
import {monoProto} from './utils';

/**
 * Creates a new synchronous event
 */
export function mono<T>(options: EmitterOptions = {}): MonoEvent<T> {
  // Set options with defaults
  const {continueOnError = false, logErrors = false} = options;

  // Create instance with shared methods
  const instance = Object.create(monoProto);

  
    // Add instance-specific properties
    instance.listeners = new Map();
    instance.onceListeners = new Map();
    instance.continueOnError = continueOnError;
    instance.logErrors = logErrors;
  return instance as MonoEvent<T>;
}
