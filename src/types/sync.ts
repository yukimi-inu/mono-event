/**
 * Synchronous event type definitions
 */

import type { EventOptions } from './common';

/**
 * Type definition for a synchronous event handler
 */
export type EventHandler<T> = (args: T) => void;

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
  add(caller: object, handler: EventHandler<T>, options?: EventOptions): () => void;

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
  remove(caller: object, handler: EventHandler<T>): boolean;

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
  add(caller: object, handler: EventHandler<T>, options?: EventOptions): () => void;

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
  remove(caller: object, handler: EventHandler<T>): boolean;

  /**
   * Remove all listeners from the event
   */
  removeAll(): void;
}