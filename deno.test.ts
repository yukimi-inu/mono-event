// @ts-nocheck
// Denoでのテスト実行をサポートするためのエントリーポイント
import { assertEquals, assert } from 'https://deno.land/std/assert/mod.ts';
import { mono, monoAsync, monoRestrict, monoRestrictAsync, monoDebounce, monoThrottle } from './dist/index.min.js';

// Helper function for async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Basic tests (existing)
Deno.test('mono basic test', () => {
  const event = mono();
  let received = '';

  event.add((msg: string) => {
    received = msg;
  });

  event.emit('Hello Deno!');
  assertEquals(received, 'Hello Deno!');
});

// 非同期テスト
Deno.test('monoAsync basic test', async () => {
  const event = monoAsync();
  let received = '';

  event.add(async (msg: string) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    received = msg;
  });

  await event.emit('Hello Async Deno!');
  assertEquals(received, 'Hello Async Deno!');
});

// 制限付きイベントテスト
Deno.test('monoRestrict basic test', () => {
  const { event, emit } = monoRestrict();
  let received = '';

  event.add((msg: string) => {
    received = msg;
  });

  emit('Hello Restricted Deno!');
  assertEquals(received, 'Hello Restricted Deno!');
});

// 制限付き非同期イベントテスト
Deno.test('monoRestrictAsync basic test', async () => {
  const { event, emit } = monoRestrictAsync();
  let received = '';

  event.add(async (msg: string) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    received = msg;
  });

  await emit('Hello Restricted Async Deno!');
  assertEquals(received, 'Hello Restricted Async Deno!');
});

// --- Decorator Tests ---

Deno.test('monoDebounce test', async () => {
  const event = mono<number>();
  const calls: number[] = [];
  const waitMs = 50;

  const debouncedHandler = monoDebounce((data: number) => {
    calls.push(data);
  }, waitMs);

  event.add(debouncedHandler);

  event.emit(1);
  event.emit(2);
  await delay(waitMs / 2);
  event.emit(3); // Reset timer

  assertEquals(calls.length, 0); // Should not have been called yet

  await delay(waitMs + 10); // Wait for debounce timer
  assertEquals(calls.length, 1);
  assertEquals(calls[0], 3); // Called with the last argument

  event.emit(4);
  await delay(waitMs + 10);
  assertEquals(calls.length, 2);
  assertEquals(calls[1], 4);
});

Deno.test('monoThrottle test (leading + trailing)', async () => {
  const event = mono<number>();
  const calls: number[] = [];
  const waitMs = 50;

  const throttledHandler = monoThrottle((data: number) => {
    calls.push(data);
  }, waitMs);

  event.add(throttledHandler);

  // 1. Immediate call (leading)
  event.emit(1);
  assertEquals(calls.length, 1);
  assertEquals(calls[0], 1);

  // 2. Throttled calls
  event.emit(2);
  await delay(waitMs / 2);
  event.emit(3);
  assertEquals(calls.length, 1); // Still 1 call

  // 3. Trailing call execution
  await delay(waitMs + 10); // Wait for throttle timer + buffer
  assertEquals(calls.length, 2);
  assertEquals(calls[1], 3); // Called with last arg (3)

  // 4. Immediate call after wait
  event.emit(4);
  assertEquals(calls.length, 3);
  assertEquals(calls[2], 4);

  // 5. Trailing call after another wait
  event.emit(5);
  await delay(waitMs + 10);
  assertEquals(calls.length, 4);
  assertEquals(calls[3], 5);
});
