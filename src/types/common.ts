/**
 * Common type definitions for mono-event
 */

/**
 * Type for objects that can be used as callers
 */
export type Caller = object;

/**
 * Generic function type
 * Note: Using 'any' is necessary here for flexibility and compatibility
 */
export type GenericFunction = (...args: any[]) => any;

/**
 * Options for event handlers
 */
export interface EventOptions {
  /**
   * Whether the handler should be automatically removed after first execution
   * @default false
   */
  once?: boolean;
}

/**
 * Options for asynchronous events
 */
export interface AsyncEventOptions {
  /**
   * Whether to run async handlers in parallel (true) or sequentially (false)
   * @default false
   */
  parallel?: boolean;
}

/**
 * Internal handler registration information
 */
export interface HandlerRegistration<T, H extends GenericFunction> {
  caller: Caller | null;
  handler: H;
  options: EventOptions;
}
