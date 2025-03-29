// docs/performance/scenarios/registerSingle.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import {mono} from '../../../dist/index.min.js';
import { measureTimeAverage } from '../utils.js';

/**
 * Runs the single-instance listener registration benchmark.
 * @param {object} config Configuration object with REGISTER_ITERATIONS.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runRegisterSingleBenchmark(config) {
    const { REGISTER_ITERATIONS } = config; // Use specific iteration count
    const results = {};
    const handlers = []; // Store handlers for removal
    for (let i = 0; i < REGISTER_ITERATIONS; i++) {
        handlers.push(() => { i; });
    }

    // mono-event
    const monoEventSingle = mono();
    results.mono = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) monoEventSingle.add(handlers[i]);
    });

    // EventEmitter3
    const ee3Single = new EventEmitter3();
    results.ee3 = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) ee3Single.on('event', handlers[i]);
    });

    // mitt
    const mittEmitterSingle = mitt();
    results.mitt = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) mittEmitterSingle.on('event', handlers[i]);
    });

    // nanoevents
    const nanoEmitterSingle = createNanoEvents();
    results.nano = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) nanoEmitterSingle.on('event', handlers[i]);
    });

    // RxJS
    const rxjsSubjectSingle = new Subject();
    results.rxjs = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) rxjsSubjectSingle.subscribe(handlers[i]);
    });

    // node:events
    const nodeEmitterSingle = new EventEmitter();
    nodeEmitterSingle.setMaxListeners(0); // Suppress warning
    results.nodeEvents = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) nodeEmitterSingle.on('event', handlers[i]);
    });

    // EventTarget
    const eventTargetSingle = new EventTarget();
    setMaxListeners(0, eventTargetSingle); // Suppress warning
    results.eventTarget = measureTimeAverage(() => {
        for (let i = 0; i < REGISTER_ITERATIONS; i++) eventTargetSingle.addEventListener('event', handlers[i]);
    });


    return results;
}