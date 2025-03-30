// @ts-nocheck
// Bunでのテスト実行をサポートするためのエントリーポイント
import { describe, expect, it, jest } from 'bun:test'; // Import jest for timer mocks
import { mono, monoAsync, monoRestrict, monoRestrictAsync, monoDebounce, monoThrottle } from './dist/index.min.js';

describe('mono-event in Bun', () => {
  // Basic tests (existing)
  it('mono basic test', () => {
    const event = mono();
    let received = '';

    event.add((msg: string) => {
      received = msg;
    });

    event.emit('Hello Bun!');
    expect(received).toBe('Hello Bun!');
  });

  // 非同期テスト
  it('monoAsync basic test', async () => {
    const event = monoAsync();
    let received = '';

    event.add(async (msg: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      received = msg;
    });

    await event.emit('Hello Async Bun!');
    expect(received).toBe('Hello Async Bun!');
  });

  // 制限付きイベントテスト
  it('monoRestrict basic test', () => {
    const { event, emit } = monoRestrict();
    let received = '';

    event.add((msg: string) => {
      received = msg;
    });

    emit('Hello Restricted Bun!');
    expect(received).toBe('Hello Restricted Bun!');
  });

  // 制限付き非同期イベントテスト
  it('monoRestrictAsync basic test', async () => {
    const { event, emit } = monoRestrictAsync();
    let received = '';

    event.add(async (msg: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      received = msg;
    });

    await emit('Hello Restricted Async Bun!');
    expect(received).toBe('Hello Restricted Async Bun!');
  });

  // --- Decorator Tests ---
  describe('monoDecorators', () => {
    jest.useFakeTimers();

    describe('monoDebounce', () => {
      it('should debounce function calls', () => {
        const handler = jest.fn();
        const waitMs = 100;
        const debouncedHandler = monoDebounce(handler, waitMs);
        const event = mono<number>();
        event.add(debouncedHandler);

        event.emit(1);
        event.emit(2);
        jest.advanceTimersByTime(waitMs / 2);
        event.emit(3); // This should reset the timer

        expect(handler).not.toHaveBeenCalled();

        jest.advanceTimersByTime(waitMs);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(3); // Called with the last argument

        event.emit(4);
        jest.advanceTimersByTime(waitMs);
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenCalledWith(4);
      });
    });

    describe('monoThrottle', () => {
      it('should throttle function calls (leading + trailing)', () => {
        const handler = jest.fn();
        const waitMs = 100;
        const throttledHandler = monoThrottle(handler, waitMs);
        const event = mono<number>();
        event.add(throttledHandler);

        // First call executes immediately (leading)
        event.emit(1);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(1);

        // Calls within the wait period are throttled
        event.emit(2);
        jest.advanceTimersByTime(waitMs / 2);
        event.emit(3);
        expect(handler).toHaveBeenCalledTimes(1); // Still only called once

        // After wait period, the trailing call executes with the last args
        jest.advanceTimersByTime(waitMs);
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenCalledWith(3); // Called with the last argument (3)

        // Subsequent call after wait executes immediately again
        event.emit(4);
        expect(handler).toHaveBeenCalledTimes(3);
        expect(handler).toHaveBeenCalledWith(4);

        // Trailing call after another wait
        event.emit(5);
        jest.advanceTimersByTime(waitMs);
        expect(handler).toHaveBeenCalledTimes(4);
        expect(handler).toHaveBeenCalledWith(5);
      });
    });
  });
});
