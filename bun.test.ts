// @ts-nocheck
// Bunでのテスト実行をサポートするためのエントリーポイント
import { describe, expect, it } from 'bun:test'; // Remove mock import
import { mono, monoAsync, monoRestrict, monoRestrictAsync } from './dist/index.min.js'; // Remove decorator imports

// Remove delay helper function

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
});
