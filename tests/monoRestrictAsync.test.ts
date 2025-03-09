import { beforeEach, describe, expect, it, vi } from 'vitest';
import { monoRestrictAsync } from '../src/monoRestrictAsync';
import { AsyncEventOptions } from '../src/types';

describe('monoRestrictAsync', () => {
  describe('event.add', () => {
    it('should add a handler and call it when emitting an event', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const handler = vi.fn();

      event.add(handler);
      await emit(42);

      expect(handler).toHaveBeenCalledWith(42);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should add a handler with caller context', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const caller = {
        value: 0,
        handler(num: number) {
          this.value = num;
        },
      };

      const spy = vi.spyOn(caller, 'handler');
      event.add(caller, caller.handler);
      await emit(42);

      expect(spy).toHaveBeenCalledWith(42);
      expect(caller.value).toBe(42);
    });

    it('should support one-time handlers with once option', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const handler = vi.fn();

      event.add(handler, { once: true });

      await emit(1);
      await emit(2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });

    it('should return an unsubscribe function', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const handler = vi.fn();

      const unsubscribe = event.add(handler);

      await emit(1);
      unsubscribe();
      await emit(2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });
  });

  describe('event.remove', () => {
    it('should remove a handler by reference', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const handler = vi.fn();

      event.add(handler);
      await emit(1);

      const removed = event.remove(handler);
      await emit(2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
      expect(removed).toBe(true);
    });

    it('should remove a handler with caller context', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const caller = {
        handler: vi.fn(),
      };

      event.add(caller, caller.handler);
      await emit(1);

      const removed = event.remove(caller, caller.handler);
      await emit(2);

      expect(caller.handler).toHaveBeenCalledTimes(1);
      expect(caller.handler).toHaveBeenCalledWith(1);
      expect(removed).toBe(true);
    });

    it('should return false when trying to remove a non-existent handler', () => {
      const { event } = monoRestrictAsync<number>();
      const handler = vi.fn();

      const removed = event.remove(handler);

      expect(removed).toBe(false);
    });
  });

  describe('event.removeAll', () => {
    it('should remove all handlers', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event.add(handler1);
      event.add(handler2);

      await emit(1);

      event.removeAll();
      await emit(2);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(1);
    });
  });

  describe('emit', () => {
    it('should call all handlers with the provided argument', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event.add(handler1);
      event.add(handler2);

      await emit(42);

      expect(handler1).toHaveBeenCalledWith(42);
      expect(handler2).toHaveBeenCalledWith(42);
    });

    it('should handle errors in handlers without affecting other handlers', async () => {
      const { event, emit } = monoRestrictAsync<number>({ continueOnError: true, logErrors: true });
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      // Mock console.error to avoid polluting test output
      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      event.add(errorHandler);
      event.add(normalHandler);

      await emit(42);

      expect(errorHandler).toHaveBeenCalledWith(42);
      expect(normalHandler).toHaveBeenCalledWith(42);
      expect(consoleErrorMock).toHaveBeenCalled();

      consoleErrorMock.mockRestore();
    });

    it('should handle async handlers', async () => {
      const { event, emit } = monoRestrictAsync<number>();
      let value = 0;

      const asyncHandler = vi.fn().mockImplementation(async (num: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        value = num;
      });

      event.add(asyncHandler);
      await emit(42);

      expect(asyncHandler).toHaveBeenCalledWith(42);
      expect(value).toBe(42);
    });

    it('should run handlers sequentially by default', async () => {
      const { event, emit } = monoRestrictAsync<void>();
      const sequence: number[] = [];

      const handler1 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        sequence.push(1);
      });

      const handler2 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        sequence.push(2);
      });

      event.add(handler1);
      event.add(handler2);

      await emit();

      expect(sequence).toEqual([1, 2]);
    });

    it('should run handlers in parallel when parallel option is true', async () => {
      const { event, emit } = monoRestrictAsync<void>({ parallel: true });
      const sequence: number[] = [];

      const handler1 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        sequence.push(1);
      });

      const handler2 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        sequence.push(2);
      });

      event.add(handler1);
      event.add(handler2);

      await emit();

      expect(sequence).toEqual([2, 1]);
    });
  });

  describe('separation of concerns', () => {
    it('should separate event registration from emission', async () => {
      const { event, emit } = monoRestrictAsync<number>();

      // Verify that event object doesn't have emit method
      expect(event).not.toHaveProperty('emit');

      // Verify that emit function works correctly
      const handler = vi.fn();
      event.add(handler);
      await emit(42);

      expect(handler).toHaveBeenCalledWith(42);
    });
  });
});
