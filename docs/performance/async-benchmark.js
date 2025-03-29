// Performance benchmark for async event libraries
import { monoAsync } from '../../dist/index.min.js';
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';

// Utility function to measure execution time
async function measureAsyncTime(fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

// Utility function to format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Benchmark configuration
const ITERATIONS = 10000; // Fewer iterations for async tests
const LISTENER_COUNT = 10;

console.log('\n=== Async Event Libraries Performance Benchmark ===');
console.log(`Iterations: ${formatNumber(ITERATIONS)}`);
console.log(`Listeners per event: ${LISTENER_COUNT}`);
console.log('\n');

// ===== Async Event Emission Benchmark =====
console.log('\n----- Async Event Emission Time (Sequential) -----');

// Setup for emission tests - create a small delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asyncHandler = async () => {
  await delay(0); // Minimal delay to simulate async work
};

// mono-event async
const monoAsyncEvent = monoAsync({ parallel: false });
for (let i = 0; i < LISTENER_COUNT; i++) {
  monoAsyncEvent.add(asyncHandler);
}
const monoAsyncEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    await monoAsyncEvent.emit();
  }
});
console.log(`mono-event (async): ${monoAsyncEmitTime.toFixed(3)} ms`);

// EventEmitter3 with async handlers
const ee3Async = new EventEmitter3();
for (let i = 0; i < LISTENER_COUNT; i++) {
  ee3Async.on('event', asyncHandler);
}
const ee3AsyncEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    ee3Async.emit('event');
    // Need to manually wait for all async handlers to complete
    await Promise.all(
      Array(LISTENER_COUNT)
        .fill()
        .map(() => delay(0)),
    );
  }
});
console.log(`EventEmitter3 (manual async): ${ee3AsyncEmitTime.toFixed(3)} ms`);

// mitt with async handlers
const mittAsync = mitt();
for (let i = 0; i < LISTENER_COUNT; i++) {
  mittAsync.on('event', asyncHandler);
}
const mittAsyncEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    mittAsync.emit('event');
    // Need to manually wait for all async handlers to complete
    await Promise.all(
      Array(LISTENER_COUNT)
        .fill()
        .map(() => delay(0)),
    );
  }
});
console.log(`mitt (manual async): ${mittAsyncEmitTime.toFixed(3)} ms`);

// nanoevents with async handlers
const nanoAsync = createNanoEvents();
for (let i = 0; i < LISTENER_COUNT; i++) {
  nanoAsync.on('event', asyncHandler);
}
const nanoAsyncEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    nanoAsync.emit('event');
    // Need to manually wait for all async handlers to complete
    await Promise.all(
      Array(LISTENER_COUNT)
        .fill()
        .map(() => delay(0)),
    );
  }
});
console.log(`nanoevents (manual async): ${nanoAsyncEmitTime.toFixed(3)} ms`);

// ===== Parallel Async Event Emission Benchmark =====
console.log('\n----- Async Event Emission Time (Parallel) -----');

// mono-event async parallel
const monoAsyncParallelEvent = monoAsync({ parallel: true });
for (let i = 0; i < LISTENER_COUNT; i++) {
  monoAsyncParallelEvent.add(asyncHandler);
}
const monoAsyncParallelEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    await monoAsyncParallelEvent.emit();
  }
});
console.log(`mono-event (async parallel): ${monoAsyncParallelEmitTime.toFixed(3)} ms`);

// EventEmitter3 with parallel async handlers
const ee3AsyncParallel = new EventEmitter3();
for (let i = 0; i < LISTENER_COUNT; i++) {
  ee3AsyncParallel.on('event', asyncHandler);
}
const ee3AsyncParallelEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const promises = [];
    for (const listener of ee3AsyncParallel.listeners('event')) {
      promises.push(listener());
    }
    await Promise.all(promises);
  }
});
console.log(`EventEmitter3 (manual parallel): ${ee3AsyncParallelEmitTime.toFixed(3)} ms`);

// mitt with parallel async handlers
const mittAsyncParallel = mitt();
for (let i = 0; i < LISTENER_COUNT; i++) {
  mittAsyncParallel.on('event', asyncHandler);
}
const mittAsyncParallelEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    // For mitt, we need to manually track and execute all handlers in parallel
    const handlers = mittAsyncParallel.all.event || [];
    await Promise.all(handlers.map((handler) => handler()));
  }
});
console.log(`mitt (manual parallel): ${mittAsyncParallelEmitTime.toFixed(3)} ms`);

// nanoevents with parallel async handlers
const nanoAsyncParallel = createNanoEvents();
for (let i = 0; i < LISTENER_COUNT; i++) {
  nanoAsyncParallel.on('event', asyncHandler);
}
const nanoAsyncParallelEmitTime = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    // For nanoevents, we need to manually execute all handlers in parallel
    // This is a simplified approach as nanoevents doesn't expose listeners directly
    const promises = [];
    nanoAsyncParallel.emit('event');
    for (let j = 0; j < LISTENER_COUNT; j++) {
      promises.push(asyncHandler());
    }
    await Promise.all(promises);
  }
});
console.log(`nanoevents (manual parallel): ${nanoAsyncParallelEmitTime.toFixed(3)} ms`);

// ===== Summary =====
console.log('\n----- Async Performance Summary (lower is better) -----');
console.log(`
| Library                    | Sequential (ms) | Parallel (ms) |
|----------------------------|-----------------|---------------|
| mono-event (async)         | ${monoAsyncEmitTime.toFixed(3).padStart(15)} | ${monoAsyncParallelEmitTime.toFixed(3).padStart(13)} |
| EventEmitter3 (manual)     | ${ee3AsyncEmitTime.toFixed(3).padStart(15)} | ${ee3AsyncParallelEmitTime.toFixed(3).padStart(13)} |
| mitt (manual)              | ${mittAsyncEmitTime.toFixed(3).padStart(15)} | ${mittAsyncParallelEmitTime.toFixed(3).padStart(13)} |
| nanoevents (manual)        | ${nanoAsyncEmitTime.toFixed(3).padStart(15)} | ${nanoAsyncParallelEmitTime.toFixed(3).padStart(13)} |
`);

console.log('\nNote: Other libraries require manual async handling, while mono-event has built-in async support.');
