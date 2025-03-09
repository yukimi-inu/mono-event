# Performance Benchmarks

This directory contains performance benchmarks comparing mono-event with other popular event libraries:

- [EventEmitter3](https://github.com/primus/eventemitter3)
- [mitt](https://github.com/developit/mitt)
- [nanoevents](https://github.com/ai/nanoevents)
- [RxJS](https://github.com/ReactiveX/rxjs)

## Benchmark Overview

The benchmarks measure several aspects of performance:

1. **Initialization Time**: How long it takes to create a new event emitter instance
2. **Listener Registration Time**: How long it takes to add event listeners
3. **Listener Removal Time**: How long it takes to remove event listeners
4. **Event Emission Time**: How long it takes to emit events to multiple listeners
5. **Memory Usage**: How much memory each event emitter instance consumes
6. **Bundle Size**: The minified and gzipped size of each library

## Running the Benchmarks

To run the benchmarks:

```bash
# Install dependencies
npm install eventemitter3 mitt nanoevents rxjs --save-dev

# Build the mono-event library
npm run build

# Run all benchmarks
node docs/performance/run-benchmark.js

# Run specific benchmarks
node --expose-gc docs/performance/benchmark.js      # Main performance benchmark
node docs/performance/bundle-size.js                # Bundle size comparison
node --expose-gc docs/performance/memory-benchmark.js  # Memory usage benchmark
```

> **Note**: The `--expose-gc` flag is required for memory usage tests.

> **Note**: Benchmark results are maintained in the main README.md file.

## Benchmark Files

- `benchmark.js` - Main performance benchmark for all libraries
- `memory-benchmark.js` - Memory usage comparison
- `bundle-size.js` - Bundle size comparison
- `run-benchmark.js` - Script to run all benchmarks
