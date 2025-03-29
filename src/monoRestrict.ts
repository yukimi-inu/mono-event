/**
 * Restricted synchronous event implementation
 */

import type {EmitterOptions} from './types';
import type {MonoRestrictedEvent} from './types/sync';
import {monoRestrictEmitProto, monoRestrictEventProto} from './utils';

/**
 * Creates a new restricted synchronous event with separated emission control
 */
export function monoRestrict<T>(options: EmitterOptions = {}): {
  event: MonoRestrictedEvent<T>;
  emit: (args: T) => void;
} {
  // Set options with defaults
  const {continueOnError = false, logErrors = false} = options;

  // Create event instance with shared methods
  const eventInstance = Object.create(monoRestrictEventProto);

  // Add instance-specific properties to eventInstance
  eventInstance.listeners = new Map();
  eventInstance.onceListeners = new Map();

  // Create emit instance with shared methods
  const emitInstance = Object.create(monoRestrictEmitProto);

  // Add instance-specific properties to emitInstance
  emitInstance.event = eventInstance;
  emitInstance.continueOnError = continueOnError;
  emitInstance.logErrors = logErrors;

  return {
    event: eventInstance as MonoRestrictedEvent<T>,
    emit: emitInstance.emit.bind(emitInstance) as (args: T) => void,
  };
}
