// docs/performance/scenarios/memoryListeners.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events';
import {mono} from '../../../dist/index.min.js';
import { forceGC } from '../utils.js';

// setMaxListeners(0); // Remove global setting

/**
 * Measures memory usage for creating instances with a specified number of listeners.
 * @param {object} config Configuration object with MEMORY_LISTENERS and MEMORY_INSTANCE_COUNT_WITH_LISTENERS.
 * @returns {object | null} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget } or null if GC not available.
 */
export function runMemoryListenersBenchmark(config) {
    const { MEMORY_LISTENERS, MEMORY_INSTANCE_COUNT_WITH_LISTENERS } = config;

    if (!((typeof global !== 'undefined' && global.gc) || (typeof Bun !== 'undefined' && Bun.gc))) {
        console.log('Memory usage test skipped (GC not exposed).');
        return null;
    }

    function measure(createFn, addListenerFn, listenerCount = MEMORY_LISTENERS, instanceCount = MEMORY_INSTANCE_COUNT_WITH_LISTENERS) {
        forceGC();
        const startMemory = process.memoryUsage().heapUsed;
        const instances = [];
        const handlers = []; // Create unique handlers
        for(let i = 0; i < listenerCount; i++) handlers.push(() => {});

        for (let i = 0; i < instanceCount; i++) {
            const instance = createFn();
            // Suppress warnings for Node built-ins
            if (instance instanceof EventEmitter) instance.setMaxListeners(0);
            if (instance instanceof EventTarget) setMaxListeners(0, instance); // Requires import { setMaxListeners } from 'node:events';
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
    results.mono = measure(() => mono(), (inst, h) => inst.add(h));
    results.ee3 = measure(() => new EventEmitter3(), (inst, h) => inst.on('event', h));
    results.mitt = measure(() => mitt(), (inst, h) => inst.on('event', h));
    results.nano = measure(() => createNanoEvents(), (inst, h) => inst.on('event', h));
    results.rxjs = measure(() => new Subject(), (inst, h) => inst.subscribe(h));
    results.nodeEvents = measure(() => new EventEmitter(), (inst, h) => inst.on('event', h)); // Added node:events
    results.eventTarget = measure(() => new EventTarget(), (inst, h) => inst.addEventListener('event', h)); // Added EventTarget

    return results;
}