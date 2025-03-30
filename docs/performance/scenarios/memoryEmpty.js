import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter } from 'node:events';
import { mono } from 'mono-event'; // Use package name
import { forceGC } from '../utils.js';

/**
 * Measures memory usage for creating empty instances.
 * Note: Requires Node.js with --expose-gc flag. Results may be inaccurate otherwise.
 * @param {object} config Configuration object with MEMORY_INSTANCE_COUNT.
 * @returns {object | null} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget } or null if GC not available.
 */
export function runMemoryEmptyBenchmark(config) {
  const { MEMORY_INSTANCE_COUNT } = config;

  // Check for Node.js specific GC availability
  if (!(typeof process !== 'undefined' && process.memoryUsage && global.gc)) {
    console.log('Memory usage test skipped (requires Node.js with --expose-gc flag).');
    return null;
  }

  function measure(createFn, count = MEMORY_INSTANCE_COUNT) {
    forceGC(); // Attempt GC, might not be effective outside Node.js
    const startMemory = process.memoryUsage().heapUsed;
    const instances = [];
    for (let i = 0; i < count; i++) instances.push(createFn());
    const endMemory = process.memoryUsage().heapUsed;
    const used = endMemory - startMemory;
    instances.length = 0; // Hint GC
    forceGC();
    return { total: used, perInstance: used / count };
  }

  const results = {};
  results.mono = measure(() => mono());
  results.ee3 = measure(() => new EventEmitter3());
  results.mitt = measure(() => mitt());
  results.nano = measure(() => createNanoEvents());
  results.rxjs = measure(() => new Subject());
  results.nodeEvents = measure(() => new EventEmitter());
  results.eventTarget = measure(() => new EventTarget());

  return results;
}
