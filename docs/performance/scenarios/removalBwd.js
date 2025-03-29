// docs/performance/scenarios/removalBwd.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import {mono} from '../../../dist/index.min.js';
import { measureTime, measureTimeAverage } from '../utils.js';

/**
 * Runs the backward listener removal benchmark.
 * @param {object} config Configuration object with REMOVAL_ITERATIONS.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runRemovalBwdBenchmark(config) {
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

        // Setup: Add listeners
        for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
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

        // Measure: Remove listeners backward
        const monoTime = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) monoRemoveEvent.remove(handlers.mono[i]); });
        const ee3Time = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) ee3Remove.off('event', handlers.ee3[i]); });
        const mittTime = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) mittRemove.off('event', handlers.mitt[i]); });
        const nanoTime = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) handlers.nano[i](); });
        const rxjsTime = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) handlers.rxjs[i].unsubscribe(); });
        const nodeEventsTime = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) nodeEmitterRemove.off('event', handlers.nodeEvents[i]); });
        const eventTargetTime = measureTime(() => { for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) eventTargetRemove.removeEventListener('event', handlers.eventTarget[i]); });

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