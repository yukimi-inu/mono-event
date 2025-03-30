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
  let lastArgs: Parameters<T> | null = null; // Store args for the trailing call
  let trailingCallScheduled = false; // Flag for pending trailing call
  let lastCallTime = 0; // Timestamp of the last execution

  function throttled(...args: Parameters<T>): void {
    const now = Date.now();

    // If wait is 0 or less, execute immediately every time
    if (wait <= 0) {
      func(...args);
      return;
    }

    const remaining = wait - (now - lastCallTime);

    if (remaining <= 0 || remaining > wait) {
      // --- Execute immediately (leading edge or after wait) ---
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCallTime = now;
      func(...args);
      trailingCallScheduled = false; // Reset trailing flag on immediate execution
      lastArgs = null; // Clear args after execution
    } else if (!timeoutId && !trailingCallScheduled) {
      // --- Schedule trailing call ---
      lastArgs = args; // Store latest args for trailing call
      trailingCallScheduled = true;
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now(); // Update last call time for the trailing execution
        timeoutId = null;
        trailingCallScheduled = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null; // Clear args after trailing execution
        }
      }, remaining);
    } else {
        // --- Update args for pending trailing call ---
        lastArgs = args; // Update with the latest arguments
    }
  }
  
  return throttled as T;
}
