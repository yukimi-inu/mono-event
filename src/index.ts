/**
 * mono-event
 * A minimal, type-safe single-event management library for JavaScript/TypeScript
 */

// Export types
export {
  EventHandler,
  AsyncEventHandler,
  EventOptions,
  AsyncEventOptions,
  MonoEvent,
  MonoAsyncEvent,
  MonoRestrictedEvent,
  MonoRestrictedAsyncEvent,
  Caller,
} from './types';

// Export functions
export { mono } from './mono';
export { monoAsync } from './monoAsync';
export { monoRestrict } from './monoRestrict';
export { monoRestrictAsync } from './monoRestrictAsync';
