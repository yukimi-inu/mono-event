/**
 * mono-event
 * A minimal, type-safe single-event management library for JavaScript/TypeScript
 */

// Export types
export {
  // Common types
  EventOptions,
  AsyncEventOptions,
  Caller,
  // Sync types
  EventHandler,
  MonoEvent,
  MonoRestrictedEvent,
  // Async types
  AsyncEventHandler,
  MonoAsyncEvent,
  MonoRestrictedAsyncEvent,
} from './types';

// Export functions
export { mono } from './mono';
export { monoAsync } from './monoAsync';
export { monoRestrict } from './monoRestrict';
export { monoRestrictAsync } from './monoRestrictAsync';
export { monoDebounce, monoThrottle } from './monoDecorators';
