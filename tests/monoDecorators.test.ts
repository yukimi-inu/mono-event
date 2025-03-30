import { describe, expect, it, vi } from 'vitest';
import { mono, monoDebounce, monoThrottle } from '../src/index'; // Adjust path as needed

describe('monoDecorators', () => {
  vi.useFakeTimers();

  describe('monoDebounce', () => {
    it('should debounce function calls', () => {
      const handler = vi.fn();
      const waitMs = 100;
      const debouncedHandler = monoDebounce(handler, waitMs);
      const event = mono<number>();
      event.add(debouncedHandler);

      event.emit(1);
      event.emit(2);
      vi.advanceTimersByTime(waitMs / 2);
      event.emit(3); // This should reset the timer

      expect(handler).not.toHaveBeenCalled();

      vi.advanceTimersByTime(waitMs);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(3); // Called with the last argument

      event.emit(4);
      vi.advanceTimersByTime(waitMs);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(4);
    });

    it('should call the function immediately if wait is 0', () => {
      const handler = vi.fn();
      const debouncedHandler = monoDebounce(handler, 0);
      const event = mono<string>();
      event.add(debouncedHandler);

      event.emit('test');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('test');
    });
  });

  describe('monoThrottle', () => {
    it('should throttle function calls (leading + trailing)', () => {
      const handler = vi.fn();
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
      vi.advanceTimersByTime(waitMs / 2);
      event.emit(3);
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once

      // After wait period, the trailing call executes with the last args
      vi.advanceTimersByTime(waitMs);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(3); // Called with the last argument (3)

      // Subsequent call after wait (should NOT execute immediately after trailing)
      event.emit(4);
      expect(handler).toHaveBeenCalledTimes(2); // Should still be 2
      expect(handler).toHaveBeenCalledWith(3); // Should still be called with 3

      // Trailing call after another wait
      event.emit(5);
      vi.advanceTimersByTime(waitMs);
      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledWith(5);
    });

    it('should handle rapid calls correctly', () => {
      const handler = vi.fn();
      const waitMs = 100;
      const throttledHandler = monoThrottle(handler, waitMs);
      const event = mono<number>();
      event.add(throttledHandler);

      event.emit(1); // Called immediately
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);

      vi.advanceTimersByTime(waitMs / 2); // 50ms
      event.emit(2); // Throttled

      vi.advanceTimersByTime(waitMs / 2); // 100ms - Trailing call for 2 should execute
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(2);

      event.emit(3); // Should NOT be called immediately after trailing
      expect(handler).toHaveBeenCalledTimes(2); // Still 2
      expect(handler).toHaveBeenCalledWith(2); // Still called with 2

      vi.advanceTimersByTime(waitMs); // 200ms - Trailing call for 3 executes
      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledWith(3); // Called with 3

      event.emit(4); // Should NOT be called immediately
      expect(handler).toHaveBeenCalledTimes(3); // Still 3
      expect(handler).toHaveBeenCalledWith(3); // Still called with 3
      event.emit(5); // Throttled, last args updated to 5
      vi.advanceTimersByTime(waitMs); // 300ms - Trailing call for 5 executes
      expect(handler).toHaveBeenCalledTimes(4);
      expect(handler).toHaveBeenCalledWith(5);
    });

    it('should call the function immediately if wait is 0', () => {
      const handler = vi.fn();
      const throttledHandler = monoThrottle(handler, 0);
      const event = mono<string>();
      event.add(throttledHandler);

      event.emit('test1');
      event.emit('test2');
      expect(handler).toHaveBeenCalledTimes(2); // Called immediately each time
      expect(handler).toHaveBeenCalledWith('test1');
      expect(handler).toHaveBeenCalledWith('test2');
    });
  });
});
