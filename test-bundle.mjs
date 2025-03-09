// テストスクリプト
import { mono, monoAsync } from './dist/index.min.js';

// 同期イベントのテスト
console.log('=== 同期イベントのテスト ===');
const event = mono();

// リスナーを追加
event.add((message) => {
  console.log(`リスナー1: ${message}`);
});

// 一度だけ実行されるリスナーを追加
event.add((message) => {
  console.log(`一度だけのリスナー: ${message}`);
}, { once: true });

// イベントを発行
console.log('最初のイベント発行:');
event.emit('こんにちは');

console.log('\n2回目のイベント発行:');
event.emit('こんにちは再び');

// 非同期イベントのテスト
console.log('\n=== 非同期イベントのテスト ===');
const asyncEvent = monoAsync();

// 非同期リスナーを追加
asyncEvent.add(async (num) => {
  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`非同期リスナー: ${num}`);
});

// 並列実行のテスト
console.log('\n=== 並列実行のテスト ===');
const parallelEvent = monoAsync({ parallel: true });

parallelEvent.add(async (num) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log(`並列リスナー1: ${num} (200ms待機)`);
});

parallelEvent.add(async (num) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`並列リスナー2: ${num} (100ms待機)`);
});

// 非同期イベントを発行
console.log('非同期イベント発行:');
await asyncEvent.emit(42);

console.log('\n並列イベント発行:');
await parallelEvent.emit(100);

console.log('\nすべてのテストが完了しました！');