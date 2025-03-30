/**
 * Creates a debounced function that delays invoking the provided function
 * until after `wait` milliseconds have elapsed since the last time the
 * debounced function was invoked.
 *
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns The new debounced function.
 */
export function monoDebounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null; // Clear timeoutId immediately after clearing
    }
    // If wait is 0 or less, execute immediately without setTimeout
    if (wait <= 0) {
      func(...args);
    } else {
      timeoutId = setTimeout(() => {
        func(...args);
        timeoutId = null; // Clear timeout after execution
      }, wait);
    }
  }) as T;
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per every `wait` milliseconds.
 *
 * @param func The function to throttle.
 * @param wait The number of milliseconds to throttle invocations to.
 * @returns The new throttled function.
 */
export function monoThrottle<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let trailingCallScheduled = false;
  let lastCallTime = 0;

  function throttled(...args: Parameters<T>): void {
    const now = Date.now();

    // If wait is 0 or less, execute immediately every time
    if (wait <= 0) {
      func(...args);
      return;
    }

    const remaining = wait - (now - lastCallTime);

    if (remaining <= 0 || remaining > wait) {
      // Execute immediately if enough time has passed or it's the first call
      if (timeoutId) {
        // Clear any pending trailing call
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCallTime = now;
      func(...args);
      trailingCallScheduled = false;
      lastArgs = null;
    } else if (!timeoutId && !trailingCallScheduled) {
      // Schedule a trailing call if not already waiting for one
      lastArgs = args;
      trailingCallScheduled = true;
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now(); // Record execution time of the trailing call
        timeoutId = null;
        trailingCallScheduled = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, remaining);
    } else {
      // Update arguments for the already scheduled trailing call
      lastArgs = args;
    }
  }

  return throttled as T;
}
