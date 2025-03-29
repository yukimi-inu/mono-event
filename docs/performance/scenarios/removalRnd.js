// docs/performance/scenarios/removalRnd.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Ensure setMaxListeners is imported
import {mono} from '../../../dist/index.min.js';
import { measureTime, measureTimeAverage, shuffleArray } from '../utils.js';

/**
 * Runs the random listener removal benchmark.
 * @param {object} config Configuration object with REMOVAL_ITERATIONS.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runRemovalRndBenchmark(config) {
    const { REMOVAL_ITERATIONS } = config;

    function runSinglePass() {
        const handlers = { mono: [], ee3: [], mitt: [], nano: [], rxjs: [], nodeEvents: [], eventTarget: [] };
        const monoRemoveEvent = mono();
        const ee3Remove = new EventEmitter3();
        const mittRemove = mitt();
        const nanoRemove = createNanoEvents();
        const rxjsRemove = new Subject();
        const nodeEmitterRemove = new EventEmitter();
        nodeEmitterRemove.setMaxListeners(0); // Suppress warning
        const eventTargetRemove = new EventTarget();
        setMaxListeners(0, eventTargetRemove); // Suppress warning
        const indices = [];

        // Setup: Add listeners
        for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
            indices.push(i);
            const handler = () => {};
            const eventTargetHandler = () => {}; // Separate for EventTarget

            handlers.mono.push(handler); monoRemoveEvent.add(handler);
            handlers.ee3.push(handler); ee3Remove.on('event', handler);
            handlers.mitt.push(handler); mittRemove.on('event', handler);
            const unbind = nanoRemove.on('event', handler); handlers.nano.push(unbind);
            const subscription = rxjsRemove.subscribe(handler); handlers.rxjs.push(subscription);
            handlers.nodeEvents.push(handler); nodeEmitterRemove.on('event', handler);
            handlers.eventTarget.push(eventTargetHandler); eventTargetRemove.addEventListener('event', eventTargetHandler);
        }

        // Shuffle the indices - use the same shuffled order for all libraries in one pass
        const shuffledIndices = shuffleArray([...indices]); // Clone indices before shuffling

        // Measure: Remove listeners randomly
        const monoTime = measureTime(() => { for (const index of shuffledIndices) monoRemoveEvent.remove(handlers.mono[index]); });
        const ee3Time = measureTime(() => { for (const index of shuffledIndices) ee3Remove.off('event', handlers.ee3[index]); });
        const mittTime = measureTime(() => { for (const index of shuffledIndices) mittRemove.off('event', handlers.mitt[index]); });
        const nanoTime = measureTime(() => { for (const index of shuffledIndices) handlers.nano[index](); });
        const rxjsTime = measureTime(() => { for (const index of shuffledIndices) handlers.rxjs[index].unsubscribe(); });
        const nodeEventsTime = measureTime(() => { for (const index of shuffledIndices) nodeEmitterRemove.off('event', handlers.nodeEvents[index]); });
        const eventTargetTime = measureTime(() => { for (const index of shuffledIndices) eventTargetRemove.removeEventListener('event', handlers.eventTarget[index]); });

        return { mono: monoTime, ee3: ee3Time, mitt: mittTime, nano: nanoTime, rxjs: rxjsTime, nodeEvents: nodeEventsTime, eventTarget: eventTargetTime };
    }

    // Run the scenario multiple times and average
    let totalMono = 0;
    let totalEe3 = 0;
    let totalMitt = 0;
    let totalNano = 0;
    let totalRxjs = 0;
    let totalNodeEvents = 0;
    let totalEventTarget = 0;
    const runs = 3;
    for (let i = 0; i < runs; i++) {
        const results = runSinglePass();
        totalMono += results.mono;
        totalEe3 += results.ee3;
        totalMitt += results.mitt;
        totalNano += results.nano;
        totalRxjs += results.rxjs;
        totalNodeEvents += results.nodeEvents;
        totalEventTarget += results.eventTarget;
    }

    return {
        mono: totalMono / runs,
        ee3: totalEe3 / runs,
        mitt: totalMitt / runs,
        nano: totalNano / runs,
        rxjs: totalRxjs / runs,
        nodeEvents: totalNodeEvents / runs,
        eventTarget: totalEventTarget / runs,
    };
}