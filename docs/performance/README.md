# Performance Benchmarks

This directory contains performance benchmarks comparing mono-event with other popular event libraries:

- [EventEmitter3](https://github.com/primus/eventemitter3)
- [mitt](https://github.com/developit/mitt)
- [nanoevents](https://github.com/ai/nanoevents)
- [RxJS](https://github.com/ReactiveX/rxjs)
- [Node Events](https://nodejs.org/api/events.html)
- [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)

## Benchmark Overview

The benchmarks measure several aspects of performance:

1.  **Initialization Time**: How long it takes to create a new event emitter instance.
2.  **Listener Registration Time**: How long it takes to add event listeners (single and multi-instance scenarios).
3.  **Listener Removal Time**: How long it takes to remove event listeners (forward, backward, and random order).
4.  **Event Emission Time**: How long it takes to emit events to multiple listeners (including `once` listeners).
5.  **Memory Usage**: How much memory each event emitter instance consumes under various conditions (empty, with listeners, concentrated events, distributed events).
6.  **Bundle Size**: The minified and gzipped size of each library.
7.  **Comprehensive Scenario**: A mixed workload simulating realistic usage patterns.

## Running the Benchmarks

To run the benchmarks:

```bash
# Install dependencies (if not already installed)
npm install eventemitter3 mitt nanoevents rxjs --save-dev

# Build the mono-event library (if not already built)
npm run build

# Run all benchmarks
# Note: This executes main performance, bundle size, and memory benchmarks.
# The --expose-gc flag is automatically handled by the script for memory tests.
node docs/performance/run-benchmark.js
```

> **Note**: Benchmark results are maintained in the main `README.md` file at the project root.

## Benchmark Files

- `run-benchmark.js`: Script to execute all benchmark suites.
- `benchmark.js`: Main performance benchmark suite (initialization, registration, removal, emission).
- `memory-benchmark.js`: Memory usage comparison suite.
- `bundle-size.js`: Bundle size comparison script.
- `async-benchmark.js`: (Optional) Asynchronous event emitter benchmarks.
- `utils.js`: Helper functions used by benchmark scripts.
- `scenarios/`: Directory containing individual benchmark scenario logic (e.g., `emission.js`, `memoryListeners.js`).
