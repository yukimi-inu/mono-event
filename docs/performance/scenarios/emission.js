// docs/performance/scenarios/emission.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import {mono, monoRestrict} from '../../../dist/index.min.js';
import { measureTime, measureTimeAverage } from '../utils.js';

/**
 * Runs the event emission benchmark.
 * @param {object} config Configuration object with LISTENER_COUNT and ITERATIONS.
 * @returns {object} Results object { mono, restrict, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runEmissionBenchmark(config) {
    const { LISTENER_COUNT, ITERATIONS } = config;
    const results = {};
    let counter = 0;
    const handlers = []; // Store handlers for removal
    for (let i = 0; i < LISTENER_COUNT; i++) {
        handlers.push(() => { counter += i; });
    }

    const eventObj = new Event('event'); // Reusable Event object for EventTarget

    function runSinglePass() {
        const passResults = {};
        // mono-event
        counter = 0; const monoEmitEvent = mono(); for (let i = 0; i < LISTENER_COUNT; i++) monoEmitEvent.add(handlers[i]);
        passResults.mono = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) monoEmitEvent.emit(); });

        // monoRestrict
        counter = 0; const {event: restrictEvent, emit: restrictEmit} = monoRestrict(); for (let i = 0; i < LISTENER_COUNT; i++) restrictEvent.add(handlers[i]);
        passResults.restrict = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) restrictEmit(); });

        // EventEmitter3
        counter = 0; const ee3Emit = new EventEmitter3(); for (let i = 0; i < LISTENER_COUNT; i++) ee3Emit.on('event', handlers[i]);
        passResults.ee3 = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) ee3Emit.emit('event'); });

        // mitt
        counter = 0; const mittEmit = mitt(); for (let i = 0; i < LISTENER_COUNT; i++) mittEmit.on('event', handlers[i]);
        passResults.mitt = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) mittEmit.emit('event'); });

        // nanoevents
        counter = 0; const nanoEmit = createNanoEvents(); for (let i = 0; i < LISTENER_COUNT; i++) nanoEmit.on('event', handlers[i]);
        passResults.nano = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) nanoEmit.emit('event'); });

        // RxJS
        counter = 0; const rxjsEmit = new Subject(); for (let i = 0; i < LISTENER_COUNT; i++) rxjsEmit.subscribe(handlers[i]);
        passResults.rxjs = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) rxjsEmit.next(); });

        // node:events
        counter = 0; const nodeEmitterEmit = new EventEmitter(); nodeEmitterEmit.setMaxListeners(0); for (let i = 0; i < LISTENER_COUNT; i++) nodeEmitterEmit.on('event', handlers[i]);
        passResults.nodeEvents = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) nodeEmitterEmit.emit('event'); });

        // EventTarget
        counter = 0; const eventTargetEmit = new EventTarget(); setMaxListeners(0, eventTargetEmit); for (let i = 0; i < LISTENER_COUNT; i++) eventTargetEmit.addEventListener('event', handlers[i]);
        passResults.eventTarget = measureTime(() => { for (let i = 0; i < ITERATIONS; i++) eventTargetEmit.dispatchEvent(eventObj); }); // Use dispatchEvent

        return passResults;
    }

     // Run the scenario multiple times and average
    let totalMono = 0;
    let totalRestrict = 0;
    let totalEe3 = 0;
    let totalMitt = 0;
    let totalNano = 0;
    let totalRxjs = 0;
    let totalNodeEvents = 0;
    let totalEventTarget = 0;
    const runs = 3;
    for (let i = 0; i < runs; i++) {
        const passResults = runSinglePass();
        totalMono += passResults.mono;
        totalRestrict += passResults.restrict;
        totalEe3 += passResults.ee3;
        totalMitt += passResults.mitt;
        totalNano += passResults.nano;
        totalRxjs += passResults.rxjs;
        totalNodeEvents += passResults.nodeEvents;
        totalEventTarget += passResults.eventTarget;
    }

    return {
        mono: totalMono / runs,
        restrict: totalRestrict / runs,
        ee3: totalEe3 / runs,
        mitt: totalMitt / runs,
        nano: totalNano / runs,
        rxjs: totalRxjs / runs,
        nodeEvents: totalNodeEvents / runs,
        eventTarget: totalEventTarget / runs,
    };
}