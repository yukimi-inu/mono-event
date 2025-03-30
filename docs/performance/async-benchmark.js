// Performance benchmark for async event libraries
import { monoAsync } from 'npm:mono-event'; // Use npm specifier
import EventEmitter3 from 'npm:eventemitter3'; // Use npm specifier
import mitt from 'npm:mitt'; // Use npm specifier
import { createNanoEvents } from 'npm:nanoevents'; // Use npm specifier
import { generateTable, formatResult, formatNumber } from './utils.js'; // Import necessary utils

// Runtime check (though not strictly needed for this script's current logic)
// const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Utility function to measure execution time
async function measureAsyncTime(fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

// Benchmark configuration
const ITERATIONS = 10000; // Fewer iterations for async tests
const LISTENER_COUNT = 10;

console.log('\n=== Async Event Libraries Performance Benchmark ===');
console.log(`Iterations: ${formatNumber(ITERATIONS)}`);
console.log(`Listeners per event: ${LISTENER_COUNT}`);
console.log('\n');

// Setup for emission tests - create a small delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asyncHandler = async () => {
  await delay(0); // Minimal delay to simulate async work
};

const results = {};

// ===== Async Event Emission Benchmark (Sequential) =====
console.log('\n----- Async Event Emission Time (Sequential) -----');

// mono-event async
const monoAsyncEvent = monoAsync({ parallel: false });
for (let i = 0; i < LISTENER_COUNT; i++) {
  monoAsyncEvent.add(asyncHandler);
}
results.monoSequential = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    await monoAsyncEvent.emit();
  }
});
console.log(`mono-event (async): ${formatResult(results.monoSequential)} ms`);

// EventEmitter3 with async handlers (Manual Sequential Wait)
const ee3Async = new EventEmitter3();
for (let i = 0; i < LISTENER_COUNT; i++) {
  ee3Async.on('event', asyncHandler);
}
results.ee3Sequential = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const listeners = ee3Async.listeners('event');
    for (const listener of listeners) {
      await listener(); // Await each listener sequentially
    }
  }
});
console.log(`EventEmitter3 (manual sequential): ${formatResult(results.ee3Sequential)} ms`);

// mitt with async handlers (Manual Sequential Wait)
const mittAsync = mitt();
for (let i = 0; i < LISTENER_COUNT; i++) {
  mittAsync.on('event', asyncHandler);
}
results.mittSequential = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handlers = mittAsync.all.get('event') || [];
    for (const handler of handlers) {
      await handler(); // Await each handler sequentially
    }
  }
});
console.log(`mitt (manual sequential): ${formatResult(results.mittSequential)} ms`);

// nanoevents with async handlers (Manual Sequential Wait)
const nanoAsync = createNanoEvents();
for (let i = 0; i < LISTENER_COUNT; i++) {
  nanoAsync.on('event', asyncHandler);
}
results.nanoSequential = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    // Nanoevents doesn't easily expose listeners, simulate sequential execution
    nanoAsync.emit('event'); // This triggers sync part, need manual await
    for (let j = 0; j < LISTENER_COUNT; j++) {
      await asyncHandler(); // Await handler execution
    }
  }
});
console.log(`nanoevents (manual sequential): ${formatResult(results.nanoSequential)} ms`);

// ===== Parallel Async Event Emission Benchmark =====
console.log('\n----- Async Event Emission Time (Parallel) -----');

// mono-event async parallel
const monoAsyncParallelEvent = monoAsync({ parallel: true });
for (let i = 0; i < LISTENER_COUNT; i++) {
  monoAsyncParallelEvent.add(asyncHandler);
}
results.monoParallel = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    await monoAsyncParallelEvent.emit();
  }
});
console.log(`mono-event (async parallel): ${formatResult(results.monoParallel)} ms`);

// EventEmitter3 with parallel async handlers (Manual Parallel Wait)
const ee3AsyncParallel = new EventEmitter3();
for (let i = 0; i < LISTENER_COUNT; i++) {
  ee3AsyncParallel.on('event', asyncHandler);
}
results.ee3Parallel = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const promises = ee3AsyncParallel.listeners('event').map((listener) => listener());
    await Promise.all(promises);
  }
});
console.log(`EventEmitter3 (manual parallel): ${formatResult(results.ee3Parallel)} ms`);

// mitt with parallel async handlers (Manual Parallel Wait)
const mittAsyncParallel = mitt();
for (let i = 0; i < LISTENER_COUNT; i++) {
  mittAsyncParallel.on('event', asyncHandler);
}
results.mittParallel = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handlers = mittAsyncParallel.all.get('event') || [];
    await Promise.all(handlers.map((handler) => handler()));
  }
});
console.log(`mitt (manual parallel): ${formatResult(results.mittParallel)} ms`);

// nanoevents with parallel async handlers (Manual Parallel Wait)
const nanoAsyncParallel = createNanoEvents();
for (let i = 0; i < LISTENER_COUNT; i++) {
  nanoAsyncParallel.on('event', asyncHandler);
}
results.nanoParallel = await measureAsyncTime(async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    // Nanoevents doesn't easily expose listeners, simulate parallel execution
    const promises = [];
    nanoAsyncParallel.emit('event'); // This triggers sync part, need manual await
    for (let j = 0; j < LISTENER_COUNT; j++) {
      promises.push(asyncHandler()); // Push promises
    }
    await Promise.all(promises); // Wait for all
  }
});
console.log(`nanoevents (manual parallel): ${formatResult(results.nanoParallel)} ms`);

// ===== Summary =====
console.log('\n----- Async Performance Summary (lower is better) -----');

// Helper functions copied from benchmark.js
function findBestValue(rows, colIndex, lowerIsBetter = true) {
  let bestVal = null;
  for (const row of rows) {
    const value = row[colIndex];
    const numericValue =
      typeof value === 'object' && value !== null && value.perInstance !== undefined
        ? value.perInstance // Handle memory object
        : value;

    if (typeof numericValue === 'number' && !Number.isNaN(numericValue)) {
      if (bestVal === null || (lowerIsBetter && numericValue < bestVal) || (!lowerIsBetter && numericValue > bestVal)) {
        bestVal = numericValue;
      }
    }
  }
  return bestVal;
}

function createBestValueFormatter(baseFormatter, bestValue) {
  return (cell) => {
    const formatted = baseFormatter(cell);
    if (bestValue === null || formatted === '-') return formatted;

    let originalValue = cell;
    // Handle memory object structure for comparison
    if (typeof cell === 'object' && cell !== null && cell.perInstance !== undefined) {
      originalValue = cell.perInstance;
    }

    if (typeof originalValue === 'number' && !Number.isNaN(originalValue) && originalValue === bestValue) {
      return `**${formatted}**`;
    }
    return formatted;
  };
}

const summaryHeaders = ['Library', 'Sequential (ms)', 'Parallel (ms)'];
const summaryRows = [
  ['mono-event (async)', results.monoSequential, results.monoParallel],
  ['EventEmitter3 (manual)', results.ee3Sequential, results.ee3Parallel],
  ['mitt (manual)', results.mittSequential, results.mittParallel],
  ['nanoevents (manual)', results.nanoSequential, results.nanoParallel],
];

// Find best values
const bestSequential = findBestValue(summaryRows, 1);
const bestParallel = findBestValue(summaryRows, 2);

// Create formatters
const formatters = [
  (v) => String(v), // Library name
  createBestValueFormatter(formatResult, bestSequential),
  createBestValueFormatter(formatResult, bestParallel),
];

console.log(
  generateTable({
    headers: summaryHeaders,
    rows: summaryRows,
    formatters: formatters,
    paddings: [28, 17, 15], // Adjusted paddings
    alignments: ['left', 'right', 'right'],
  }),
);

console.log('\nNote: Other libraries require manual async handling, while mono-event has built-in async support.');
