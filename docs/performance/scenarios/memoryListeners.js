import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter } from 'node:events'; // Removed setMaxListeners import
import { mono } from 'mono-event'; // Use package name
import { forceGC } from '../utils.js';

/**
 * Measures memory usage for creating instances with a specified number of listeners.
 * Note: Requires Node.js with --expose-gc flag. Results may be inaccurate otherwise.
 * @param {object} config Configuration object with MEMORY_LISTENERS and MEMORY_INSTANCE_COUNT_WITH_LISTENERS.
 * @returns {object | null} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget } or null if GC not available.
 */
export function runMemoryListenersBenchmark(config) {
  const { MEMORY_LISTENERS, MEMORY_INSTANCE_COUNT_WITH_LISTENERS } = config;

  // Check for Node.js specific GC availability
  if (!(typeof process !== 'undefined' && process.memoryUsage && global.gc)) {
    console.log('Memory usage test skipped (requires Node.js with --expose-gc flag).');
    return null;
  }

  function measure(
    createFn,
    addListenerFn,
    listenerCount = MEMORY_LISTENERS,
    instanceCount = MEMORY_INSTANCE_COUNT_WITH_LISTENERS,
  ) {
    forceGC(); // Attempt GC, might not be effective outside Node.js
    const startMemory = process.memoryUsage().heapUsed;
    const instances = [];
    const handlers = []; // Create unique handlers
    for (let i = 0; i < listenerCount; i++) handlers.push(() => {});

    for (let i = 0; i < instanceCount; i++) {
      const instance = createFn();
      // Removed setMaxListeners calls
      for (let j = 0; j < listenerCount; j++) addListenerFn(instance, handlers[j]);
      instances.push(instance);
    }

    const endMemory = process.memoryUsage().heapUsed;
    const used = endMemory - startMemory;
    instances.length = 0; // Hint GC
    handlers.length = 0;
    forceGC();
    return { total: used, perInstance: used / instanceCount };
  }

  const results = {};
  results.mono = measure(
    () => mono(),
    (inst, h) => inst.add(h),
  );
  results.ee3 = measure(
    () => new EventEmitter3(),
    (inst, h) => inst.on('event', h),
  );
  results.mitt = measure(
    () => mitt(),
    (inst, h) => inst.on('event', h),
  );
  results.nano = measure(
    () => createNanoEvents(),
    (inst, h) => inst.on('event', h),
  );
  results.rxjs = measure(
    () => new Subject(),
    (inst, h) => inst.subscribe(h),
  );
  results.nodeEvents = measure(
    () => new EventEmitter(),
    (inst, h) => inst.on('event', h),
  );
  results.eventTarget = measure(
    () => new EventTarget(),
    (inst, h) => inst.addEventListener('event', h),
  );

  return results;
}
