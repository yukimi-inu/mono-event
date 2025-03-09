import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mono } from '../src/mono';
import { EventOptions } from '../src/types';

describe('mono', () => {
  describe('add', () => {
    it('should add a handler and call it when emitting an event', () => {
      const event = mono<string>();
      const handler = vi.fn();

      event.add(handler);
      event.emit('test');

      expect(handler).toHaveBeenCalledWith('test');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should add a handler with caller context', () => {
      const event = mono<string>();
      const caller = {
        value: 'caller context',
        handler(msg: string) {
          this.value = msg;
        },
      };

      const spy = vi.spyOn(caller, 'handler');
      event.add(caller, caller.handler);
      event.emit('new value');

      expect(spy).toHaveBeenCalledWith('new value');
      expect(caller.value).toBe('new value');
    });

    it('should support one-time handlers with once option', () => {
      const event = mono<string>();
      const handler = vi.fn();

      event.add(handler, { once: true });

      event.emit('first');
      event.emit('second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should return an unsubscribe function', () => {
      const event = mono<string>();
      const handler = vi.fn();

      const unsubscribe = event.add(handler);

      event.emit('first');
      unsubscribe();
      event.emit('second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });
  });

  describe('remove', () => {
    it('should remove a handler by reference', () => {
      const event = mono<string>();
      const handler = vi.fn();

      event.add(handler);
      event.emit('first');

      const removed = event.remove(handler);
      event.emit('second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
      expect(removed).toBe(true);
    });

    it('should remove a handler with caller context', () => {
      const event = mono<string>();
      const caller = {
        handler: vi.fn(),
      };

      event.add(caller, caller.handler);
      event.emit('first');

      const removed = event.remove(caller, caller.handler);
      event.emit('second');

      expect(caller.handler).toHaveBeenCalledTimes(1);
      expect(caller.handler).toHaveBeenCalledWith('first');
      expect(removed).toBe(true);
    });

    it('should return false when trying to remove a non-existent handler', () => {
      const event = mono<string>();
      const handler = vi.fn();

      const removed = event.remove(handler);

      expect(removed).toBe(false);
    });
  });

  describe('removeAll', () => {
    it('should remove all handlers', () => {
      const event = mono<string>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event.add(handler1);
      event.add(handler2);

      event.emit('first');

      event.removeAll();
      event.emit('second');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith('first');
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith('first');
    });
  });

  describe('emit', () => {
    it('should call all handlers with the provided argument', () => {
      const event = mono<string>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      event.add(handler1);
      event.add(handler2);

      event.emit('test');

      expect(handler1).toHaveBeenCalledWith('test');
      expect(handler2).toHaveBeenCalledWith('test');
    });

    it('should handle errors in handlers without affecting other handlers', () => {
      const event = mono<string>();
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      // Mock console.error to avoid polluting test output
      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      event.add(errorHandler);
      event.add(normalHandler);

      event.emit('test');

      expect(errorHandler).toHaveBeenCalledWith('test');
      expect(normalHandler).toHaveBeenCalledWith('test');
      expect(consoleErrorMock).toHaveBeenCalled();

      consoleErrorMock.mockRestore();
    });

    it('should handle removal during emission', () => {
      const event = mono<string>();
      const handler1 = vi.fn();
      const handler2 = vi.fn().mockImplementation(() => {
        event.remove(handler1);
      });
      const handler3 = vi.fn();

      event.add(handler1);
      event.add(handler2);
      event.add(handler3);

      event.emit('test');

      expect(handler1).toHaveBeenCalledWith('test');
      expect(handler2).toHaveBeenCalledWith('test');
      expect(handler3).toHaveBeenCalledWith('test');

      event.emit('second');

      expect(handler1).toHaveBeenCalledTimes(1); // Not called for 'second'
      expect(handler2).toHaveBeenCalledTimes(2);
      expect(handler3).toHaveBeenCalledTimes(2);
    });
  });
});
