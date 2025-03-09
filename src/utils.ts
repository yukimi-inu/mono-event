/**
 * Shared utilities for mono-event implementations
 */

import type { Caller, EventOptions, GenericFunction } from './types';

/**
 * Listener information structure
 */
export interface ListenerInfo<H extends GenericFunction> {
  handler: H;
  caller: Caller | null;
  once: boolean;
}

// Optimized argument parsing with minimal object creation
export function parseAddArgs<H extends GenericFunction>(
  args: unknown[]
): { handler: H; caller: Caller | null; options: EventOptions } {
  const isFunc = typeof args[0] === 'function';
  // Reuse the same object for all calls to reduce allocations
  const result = {
    handler: isFunc ? args[0] as H : args[1] as H,
    caller: isFunc ? null : args[0] as Caller,
    options: (isFunc ? args[1] : args[2]) as EventOptions || {}
  };
  return result;
}

// Optimized unsubscribe function
export function createUnsubscribe<H extends GenericFunction>(
  listeners: Array<ListenerInfo<H>>,
  listenerInfo: ListenerInfo<H>
): () => void {
  // Use closure to avoid creating new functions
  return function unsubscribe() {
    const index = listeners.indexOf(listenerInfo);
    if (index !== -1) listeners.splice(index, 1);
  };
}

// Optimized argument parsing for remove
export function parseRemoveArgs<H extends GenericFunction>(
  args: unknown[]
): { handler: H; caller: Caller | null } {
  const isSingle = args.length === 1;
  return {
    handler: isSingle ? args[0] as H : args[1] as H,
    caller: isSingle ? null : args[0] as Caller
  };
}

// Optimized find and remove
export function findAndRemove<H extends GenericFunction>(
  listeners: Array<ListenerInfo<H>>,
  handler: H,
  caller: Caller | null
): boolean {
  for (let i = 0; i < listeners.length; i++) {
    const l = listeners[i];
    if (l.caller === caller && l.handler === handler) {
      listeners.splice(i, 1);
      return true;
    }
  }
  return false;
}

// Optimized handler execution
export function executeHandler<T>(
  listener: ListenerInfo<(args: T) => any> | undefined,
  args: T,
  continueOnError: boolean,
  logErrors: boolean
): any {
  // Skip if listener is undefined (might happen if removed during iteration)
  if (!listener) return;
  
  try {
    return listener.caller
      ? listener.handler.call(listener.caller, args)
      : listener.handler(args);
  } catch (error) {
    if (logErrors) console.error('Error in event handler:', error);
    if (!continueOnError) throw error;
  }
}

// Optimized once listener removal
export function removeOnceListeners<H extends GenericFunction>(
  listeners: Array<ListenerInfo<H>>,
  toRemoveIndexes: number[]
): void {
  if (!toRemoveIndexes.length) return;
  
  // Sort in descending order to avoid index shifting issues
  toRemoveIndexes.sort((a, b) => b - a);
  
  // Remove from highest to lowest index
  for (let i = 0; i < toRemoveIndexes.length; i++) {
    listeners.splice(toRemoveIndexes[i], 1);
  }
}