// @ts-nocheck
// Denoでのテスト実行をサポートするためのエントリーポイント
import { assertEquals } from 'https://deno.land/std/assert/mod.ts';
import { mono, monoAsync, monoRestrict, monoRestrictAsync } from './dist/index.min.js';

// 基本的なテスト
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
