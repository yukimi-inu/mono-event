/**
 * Asynchronous event type definitions
 */

import type {EventOptions} from './common';

/**
 * Type definition for an asynchronous event handler
 */
export type AsyncEventHandler<T> = (args: T) => Promise<void> | void;

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
  add(caller: object, handler: AsyncEventHandler<T>, options?: EventOptions): () => void;

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
  remove(caller: object, handler: AsyncEventHandler<T>): boolean;

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
  add(caller: object, handler: AsyncEventHandler<T>, options?: EventOptions): () => void;

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
  remove(caller: object, handler: AsyncEventHandler<T>): boolean;

  /**
   * Remove all listeners from the event
   */
  removeAll(): void;
}
