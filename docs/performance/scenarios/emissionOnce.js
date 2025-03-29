// docs/performance/scenarios/emissionOnce.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import {mono} from '../../../dist/index.min.js';
import { measureTime, measureTimeAverage } from '../utils.js';

/**
 * Runs the event emission benchmark for 'once' listeners.
 * @param {object} config Configuration object with ONCE_LISTENER_COUNT.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runEmissionOnceBenchmark(config) {
    const { ONCE_LISTENER_COUNT } = config;
    const eventObj = new Event('event'); // Reusable Event object for EventTarget

    function runSinglePass() {
        const passResults = {};
        let onceCounter = 0;
        const handlers = []; // Store handlers for removal
        for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
            handlers.push(() => { onceCounter += i; });
        }

        // mono-event
        onceCounter = 0; const monoEmitOnceEvent = mono(); for (let i = 0; i < ONCE_LISTENER_COUNT; i++) monoEmitOnceEvent.add(handlers[i], {once: true});
        passResults.mono = measureTime(() => { monoEmitOnceEvent.emit(); });

        // EventEmitter3
        onceCounter = 0; const ee3EmitOnce = new EventEmitter3(); for (let i = 0; i < ONCE_LISTENER_COUNT; i++) ee3EmitOnce.once('event', handlers[i]);
        passResults.ee3 = measureTime(() => { ee3EmitOnce.emit('event'); });

        // mitt
        onceCounter = 0; const mittEmitOnce = mitt(); const mittOnceHandlers = []; for (let i = 0; i < ONCE_LISTENER_COUNT; i++) { const w = (e) => { handlers[i](e); mittEmitOnce.off('event', w); }; mittOnceHandlers.push(w); mittEmitOnce.on('event', w); }
        passResults.mitt = measureTime(() => { mittEmitOnce.emit('event'); });

        // nanoevents
        onceCounter = 0; const nanoEmitOnce = createNanoEvents(); const nanoUnbinds = []; for (let i = 0; i < ONCE_LISTENER_COUNT; i++) { const u = nanoEmitOnce.on('event', (e) => { u(); handlers[i](e); }); nanoUnbinds.push(u); }
        passResults.nano = measureTime(() => { nanoEmitOnce.emit('event'); });

        // RxJS
        onceCounter = 0; const rxjsEmitOnce = new Subject(); for (let i = 0; i < ONCE_LISTENER_COUNT; i++) { const s = rxjsEmitOnce.subscribe(d => { handlers[i](d); s.unsubscribe(); }); }
        passResults.rxjs = measureTime(() => { rxjsEmitOnce.next(); });

        // node:events
        onceCounter = 0; const nodeEmitterOnce = new EventEmitter(); nodeEmitterOnce.setMaxListeners(0); for (let i = 0; i < ONCE_LISTENER_COUNT; i++) nodeEmitterOnce.once('event', handlers[i]);
        passResults.nodeEvents = measureTime(() => { nodeEmitterOnce.emit('event'); });

        // EventTarget
        onceCounter = 0; const eventTargetOnce = new EventTarget(); setMaxListeners(0, eventTargetOnce); for (let i = 0; i < ONCE_LISTENER_COUNT; i++) eventTargetOnce.addEventListener('event', handlers[i], {once: true});
        passResults.eventTarget = measureTime(() => { eventTargetOnce.dispatchEvent(eventObj); });

        return passResults;
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
        const passResults = runSinglePass();
        totalMono += passResults.mono;
        totalEe3 += passResults.ee3;
        totalMitt += passResults.mitt;
        totalNano += passResults.nano;
        totalRxjs += passResults.rxjs;
        totalNodeEvents += passResults.nodeEvents;
        totalEventTarget += passResults.eventTarget;
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