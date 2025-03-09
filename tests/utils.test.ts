import { describe, expect, it, vi } from 'vitest';
import type { HandlerRegistration } from '../src/types';
import { createHandlerRegistration, executeAsyncHandler, executeHandler, findHandlerIndex } from '../src/utils';

describe('utils', () => {
  describe('createHandlerRegistration', () => {
    it('should create a registration with a standalone handler', () => {
      const handler = () => {};
      const options = { once: true };

      const registration = createHandlerRegistration<string, typeof handler>([handler, options]);

      expect(registration).toEqual({
        caller: null,
        handler,
        options,
      });
    });

    it('should create a registration with a caller and handler', () => {
      const caller = {};
      const handler = () => {};
      const options = { once: true };

      const registration = createHandlerRegistration<string, typeof handler>([caller, handler, options]);

      expect(registration).toEqual({
        caller,
        handler,
        options,
      });
    });

    it('should use empty options object if not provided for standalone handler', () => {
      const handler = () => {};

      const registration = createHandlerRegistration<string, typeof handler>([handler]);

      expect(registration).toEqual({
        caller: null,
        handler,
        options: {},
      });
    });

    it('should use empty options object if not provided for caller+handler', () => {
      const caller = {};
      const handler = () => {};

      const registration = createHandlerRegistration<string, typeof handler>([caller, handler]);

      expect(registration).toEqual({
        caller,
        handler,
        options: {},
      });
    });
  });

  describe('executeHandler', () => {
    it('should execute a handler without caller context', () => {
      const handler = vi.fn();
      const registration: HandlerRegistration<string, typeof handler> = {
        caller: null,
        handler,
        options: {},
      };

      executeHandler(registration, 'test');

      expect(handler).toHaveBeenCalledWith('test');
    });

    it('should execute a handler with caller context', () => {
      const caller = {
        value: 'initial',
        handler(msg: string) {
          this.value = msg;
        },
      };

      const spy = vi.spyOn(caller, 'handler');
      const registration: HandlerRegistration<string, typeof caller.handler> = {
        caller,
        handler: caller.handler,
        options: {},
      };

      executeHandler(registration, 'updated');

      expect(spy).toHaveBeenCalledWith('updated');
      expect(caller.value).toBe('updated');
    });

    it('should catch and log errors', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const registration: HandlerRegistration<string, typeof handler> = {
        caller: null,
        handler,
        options: {},
      };

      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      executeHandler(registration, 'test');

      expect(handler).toHaveBeenCalledWith('test');
      expect(consoleErrorMock).toHaveBeenCalled();

      consoleErrorMock.mockRestore();
    });
  });

  describe('executeAsyncHandler', () => {
    it('should execute an async handler without caller context', async () => {
      const handler = vi.fn();
      const registration: HandlerRegistration<number, typeof handler> = {
        caller: null,
        handler,
        options: {},
      };

      await executeAsyncHandler(registration, 42);

      expect(handler).toHaveBeenCalledWith(42);
    });

    it('should execute an async handler with caller context', async () => {
      const caller = {
        value: 0,
        handler(num: number) {
          this.value = num;
        },
      };

      const spy = vi.spyOn(caller, 'handler');
      const registration: HandlerRegistration<number, typeof caller.handler> = {
        caller,
        handler: caller.handler,
        options: {},
      };

      await executeAsyncHandler(registration, 42);

      expect(spy).toHaveBeenCalledWith(42);
      expect(caller.value).toBe(42);
    });

    it('should handle promises returned by handlers', async () => {
      let value = 0;
      const handler = vi.fn().mockImplementation(async (num: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        value = num;
      });

      const registration: HandlerRegistration<number, typeof handler> = {
        caller: null,
        handler,
        options: {},
      };

      await executeAsyncHandler(registration, 42);

      expect(handler).toHaveBeenCalledWith(42);
      expect(value).toBe(42);
    });

    it('should catch and log errors', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const registration: HandlerRegistration<number, typeof handler> = {
        caller: null,
        handler,
        options: {},
      };

      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      await executeAsyncHandler(registration, 42);

      expect(handler).toHaveBeenCalledWith(42);
      expect(consoleErrorMock).toHaveBeenCalled();

      consoleErrorMock.mockRestore();
    });

    it('should catch and log errors in promises', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Async error');
      });

      const registration: HandlerRegistration<number, typeof handler> = {
        caller: null,
        handler,
        options: {},
      };

      const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      await executeAsyncHandler(registration, 42);

      expect(handler).toHaveBeenCalledWith(42);
      expect(consoleErrorMock).toHaveBeenCalled();

      consoleErrorMock.mockRestore();
    });
  });

  describe('findHandlerIndex', () => {
    it('should find a standalone handler', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const handler3 = () => {};

      const registrations: HandlerRegistration<string, typeof handler1>[] = [
        { caller: null, handler: handler1, options: {} },
        { caller: {}, handler: handler2, options: {} },
        { caller: null, handler: handler3, options: {} },
      ];

      const index = findHandlerIndex(registrations, handler3, undefined);

      expect(index).toBe(2);
    });

    it('should find a handler with caller context', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const caller1 = {};
      const caller2 = {};

      const registrations: HandlerRegistration<string, typeof handler1>[] = [
        { caller: null, handler: handler1, options: {} },
        { caller: caller1, handler: handler2, options: {} },
        { caller: caller2, handler: handler1, options: {} },
      ];

      const index = findHandlerIndex(registrations, caller2, handler1);

      expect(index).toBe(2);
    });

    it('should return -1 when standalone handler is not found', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const notRegistered = () => {};

      const registrations: HandlerRegistration<string, typeof handler1>[] = [
        { caller: null, handler: handler1, options: {} },
        { caller: {}, handler: handler2, options: {} },
      ];

      const index = findHandlerIndex(registrations, notRegistered, undefined);

      expect(index).toBe(-1);
    });

    it('should return -1 when caller+handler pair is not found', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const caller1 = {};
      const caller2 = {};

      const registrations: HandlerRegistration<string, typeof handler1>[] = [
        { caller: null, handler: handler1, options: {} },
        { caller: caller1, handler: handler2, options: {} },
      ];

      const index = findHandlerIndex(registrations, caller2, handler1);

      expect(index).toBe(-1);
    });
  });
});
