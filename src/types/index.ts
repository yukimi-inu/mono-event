/**
 * Type definitions for mono-event
 */

// Export common types
export {
  Caller,
  EventOptions,
  AsyncEventOptions,
  HandlerRegistration,
  GenericFunction,
} from './common';

// Export synchronous event types
export {
  EventHandler,
  MonoEvent,
  MonoRestrictedEvent,
} from './sync';

// Export asynchronous event types
export {
  AsyncEventHandler,
  MonoAsyncEvent,
  MonoRestrictedAsyncEvent,
} from './async';
