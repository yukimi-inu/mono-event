/**
 * mono-event
 * A minimal, type-safe single-event management library for JavaScript/TypeScript
 */

/**
 * Type definition for a synchronous event handler
 */
export type EventHandler<T> = (args: T) => void;

/**
 * Type definition for an asynchronous event handler
 */
export type AsyncEventHandler<T> = (args: T) => Promise<void> | void;

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
 * Type for objects that can be used as callers
 */
export type Caller = object;

/**
 * Internal handler registration information
 */
export interface HandlerRegistration<T, H extends GenericFunction> {
  caller: Caller | null;
  handler: H;
  options: EventOptions;
}

/**
 * Type definition for a synchronous event
 */
export interface MonoEvent<T> {
  /**
   * Add a listener to the event
   * @param handler The event handler function
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(handler: EventHandler<T>, options?: EventOptions): () => void;
  
  /**
   * Add a listener to the event with a caller context
   * @param caller The object that will be 'this' in the handler
   * @param handler The event handler method
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(caller: Caller, handler: EventHandler<T>, options?: EventOptions): () => void;

  /**
   * Remove a specific listener from the event
   * @param handler The event handler function to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(handler: EventHandler<T>): boolean;

  /**
   * Remove a specific listener with caller context from the event
   * @param caller The caller object
   * @param handler The event handler method to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(caller: Caller, handler: EventHandler<T>): boolean;

  /**
   * Remove all listeners from the event
   */
  removeAll(): void;

  /**
   * Emit an event with the provided arguments
   * @param args The event arguments
   */
  emit(args: T): void;
}

/**
 * Type definition for an asynchronous event
 */
export interface MonoAsyncEvent<T> {
  /**
   * Add a listener to the event
   * @param handler The event handler function (can be async)
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(handler: AsyncEventHandler<T>, options?: EventOptions): () => void;
  
  /**
   * Add a listener to the event with a caller context
   * @param caller The object that will be 'this' in the handler
   * @param handler The event handler method (can be async)
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(caller: Caller, handler: AsyncEventHandler<T>, options?: EventOptions): () => void;

  /**
   * Remove a specific listener from the event
   * @param handler The event handler function to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(handler: AsyncEventHandler<T>): boolean;

  /**
   * Remove a specific listener with caller context from the event
   * @param caller The caller object
   * @param handler The event handler method to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(caller: Caller, handler: AsyncEventHandler<T>): boolean;

  /**
   * Remove all listeners from the event
   */
  removeAll(): void;

  /**
   * Emit an event with the provided arguments and wait for all handlers to complete
   * @param args The event arguments
   * @returns A promise that resolves when all handlers have completed
   */
  emit(args: T): Promise<void>;
}

/**
 * Type definition for a restricted event (without emit method)
 */
export interface MonoRestrictedEvent<T> {
  /**
   * Add a listener to the event
   * @param handler The event handler function
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(handler: EventHandler<T>, options?: EventOptions): () => void;
  
  /**
   * Add a listener to the event with a caller context
   * @param caller The object that will be 'this' in the handler
   * @param handler The event handler method
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(caller: Caller, handler: EventHandler<T>, options?: EventOptions): () => void;

  /**
   * Remove a specific listener from the event
   * @param handler The event handler function to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(handler: EventHandler<T>): boolean;

  /**
   * Remove a specific listener with caller context from the event
   * @param caller The caller object
   * @param handler The event handler method to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(caller: Caller, handler: EventHandler<T>): boolean;

  /**
   * Remove all listeners from the event
   */
  removeAll(): void;
}

/**
 * Type definition for a restricted asynchronous event (without emit method)
 */
export interface MonoRestrictedAsyncEvent<T> {
  /**
   * Add a listener to the event
   * @param handler The event handler function (can be async)
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(handler: AsyncEventHandler<T>, options?: EventOptions): () => void;
  
  /**
   * Add a listener to the event with a caller context
   * @param caller The object that will be 'this' in the handler
   * @param handler The event handler method (can be async)
   * @param options Options for the handler
   * @returns A function to remove the listener
   */
  add(caller: Caller, handler: AsyncEventHandler<T>, options?: EventOptions): () => void;

  /**
   * Remove a specific listener from the event
   * @param handler The event handler function to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(handler: AsyncEventHandler<T>): boolean;

  /**
   * Remove a specific listener with caller context from the event
   * @param caller The caller object
   * @param handler The event handler method to remove
   * @returns true if the handler was found and removed, false otherwise
   */
  remove(caller: Caller, handler: AsyncEventHandler<T>): boolean;

  /**
   * Remove all listeners from the event
   */
  removeAll(): void;
}
