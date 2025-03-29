// docs/performance/scenarios/comprehensive.js
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import {mono} from '../../../dist/index.min.js';
import { measureTimeAverage, measureTime, generateBenchmarkTable, formatResult } from '../utils.js'; // Import necessary utils

/**
 * Runs the comprehensive benchmark scenario simulating a more realistic usage pattern.
 * @param {object} config Configuration object with COMP_INSTANCE_COUNT, etc.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runComprehensiveBenchmark(config) {
    const {
        COMP_INSTANCE_COUNT,
        COMP_INITIAL_LISTENERS,
        COMP_ADD_LISTENERS,
        COMP_REMOVE_LISTENERS,
        COMP_FINAL_ADD_LISTENERS,
        COMP_EMIT_COUNT
    } = config;
    const results = {};
    const eventObj = new Event('event');
    const phaseResults = {}; // Store phase timings for all libs (keyed by internal lib key)

    // --- Scenario Runner with Phase Timing Collection ---
    function runComprehensiveScenarioWithTiming(libKey, createFn, addFn, removeFn, emitFn) {
        const phaseTimes = { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, phase6: 0 };
        const runs = 3; // Match measureTimeAverage default

        const totalTime = measureTimeAverage(() => {
            const instances = [];
            let start;
            let end;

            // Phase 1: Create instances and add initial listeners
            start = performance.now();
            for (let i = 0; i < COMP_INSTANCE_COUNT; i++) {
                const instance = createFn();
                if (instance instanceof EventEmitter) instance.setMaxListeners(0);
                if (instance instanceof EventTarget) setMaxListeners(0, instance);
                const initialHandlers = [];
                for (let j = 0; j < COMP_INITIAL_LISTENERS; j++) { const h = () => {}; addFn(instance, h); initialHandlers.push(h); }
                instances.push({ instance, handlers: initialHandlers });
            }
            end = performance.now();
            phaseTimes.phase1 += (end - start);

            // Phase 2: Emit first time
            start = performance.now();
            for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) emitFn(item.instance, i);
            end = performance.now();
            phaseTimes.phase2 += (end - start);

            // Phase 3: Add/Remove listeners
            start = performance.now();
            const midPoint = Math.floor(COMP_INSTANCE_COUNT / 2);
            for (let i = 0; i < COMP_INSTANCE_COUNT; i++) {
                if (i < midPoint) { for (let j = 0; j < COMP_ADD_LISTENERS; j++) { const h = () => {}; addFn(instances[i].instance, h); instances[i].handlers.push(h); } }
                else { for (let j = 0; j < COMP_REMOVE_LISTENERS; j++) if (instances[i].handlers.length > 0) { const idx = Math.floor(Math.random() * instances[i].handlers.length); const h = instances[i].handlers.splice(idx, 1)[0]; removeFn(instances[i].instance, h); } }
            }
            end = performance.now();
            phaseTimes.phase3 += (end - start);

            // Phase 4: Emit second time
            start = performance.now();
            for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) emitFn(item.instance, i + COMP_EMIT_COUNT);
            end = performance.now();
            phaseTimes.phase4 += (end - start);

            // Phase 5: Add final listeners
            start = performance.now();
            for (let i = 0; i < COMP_INSTANCE_COUNT; i++) for (let j = 0; j < COMP_FINAL_ADD_LISTENERS; j++) { const h = () => {}; addFn(instances[i].instance, h); instances[i].handlers.push(h); }
            end = performance.now();
            phaseTimes.phase5 += (end - start);

            // Phase 6: Emit third time
            start = performance.now();
            for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) emitFn(item.instance, i + COMP_EMIT_COUNT * 2);
            end = performance.now();
            phaseTimes.phase6 += (end - start);

        }, runs); // Use the same number of runs as measureTimeAverage

        // Store average phase times using the internal libKey
        phaseResults[libKey] = {
            phase1: phaseTimes.phase1 / runs,
            phase2: phaseTimes.phase2 / runs,
            phase3: phaseTimes.phase3 / runs,
            phase4: phaseTimes.phase4 / runs,
            phase5: phaseTimes.phase5 / runs,
            phase6: phaseTimes.phase6 / runs,
        };
        return totalTime; // Return total average time
    }

     // --- Run for each library ---
    results.mono = runComprehensiveScenarioWithTiming('mono', () => mono(), (inst, h) => inst.add(h), (inst, h) => inst.remove(h), (inst, data) => inst.emit(data));
    results.ee3 = runComprehensiveScenarioWithTiming('ee3', () => new EventEmitter3(), (inst, h) => inst.on('event', h), (inst, h) => inst.off('event', h), (inst, data) => inst.emit('event', data));
    results.mitt = runComprehensiveScenarioWithTiming('mitt', () => mitt(), (inst, h) => inst.on('event', h), (inst, h) => inst.off('event', h), (inst, data) => inst.emit('event', data));
    results.nodeEvents = runComprehensiveScenarioWithTiming('nodeEvents', () => new EventEmitter(), (inst, h) => inst.on('event', h), (inst, h) => inst.off('event', h), (inst, data) => inst.emit('event', data));
    results.eventTarget = runComprehensiveScenarioWithTiming('eventTarget', () => new EventTarget(), (inst, h) => inst.addEventListener('event', h), (inst, h) => inst.removeEventListener('event', h), (inst, data) => inst.dispatchEvent(eventObj));

    // --- Special handling for NanoEvents and RxJS ---
    // NanoEvents
    const nanoPhaseTimes = { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, phase6: 0 };
    results.nano = measureTimeAverage(() => {
        const instances = []; let start, end;
        start = performance.now(); for (let i = 0; i < COMP_INSTANCE_COUNT; i++) { const instance = createNanoEvents(); const unbinds = []; for (let j = 0; j < COMP_INITIAL_LISTENERS; j++) unbinds.push(instance.on('event', () => {})); instances.push({ instance, unbinds }); } end = performance.now(); nanoPhaseTimes.phase1 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) item.instance.emit('event', i); end = performance.now(); nanoPhaseTimes.phase2 += (end - start);
        start = performance.now(); const midPoint = Math.floor(COMP_INSTANCE_COUNT / 2); for (let i = 0; i < COMP_INSTANCE_COUNT; i++) { if (i < midPoint) { for (let j = 0; j < COMP_ADD_LISTENERS; j++) instances[i].unbinds.push(instances[i].instance.on('event', () => {})); } else { for (let j = 0; j < COMP_REMOVE_LISTENERS; j++) if (instances[i].unbinds.length > 0) instances[i].unbinds.pop()(); } } end = performance.now(); nanoPhaseTimes.phase3 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) item.instance.emit('event', i + COMP_EMIT_COUNT); end = performance.now(); nanoPhaseTimes.phase4 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_INSTANCE_COUNT; i++) for (let j = 0; j < COMP_FINAL_ADD_LISTENERS; j++) instances[i].unbinds.push(instances[i].instance.on('event', () => {})); end = performance.now(); nanoPhaseTimes.phase5 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) item.instance.emit('event', i + COMP_EMIT_COUNT * 2); end = performance.now(); nanoPhaseTimes.phase6 += (end - start);
    }, 3);
    phaseResults.nano = { phase1: nanoPhaseTimes.phase1 / 3, phase2: nanoPhaseTimes.phase2 / 3, phase3: nanoPhaseTimes.phase3 / 3, phase4: nanoPhaseTimes.phase4 / 3, phase5: nanoPhaseTimes.phase5 / 3, phase6: nanoPhaseTimes.phase6 / 3 }; // Use dot notation

    // RxJS
    const rxjsPhaseTimes = { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, phase6: 0 };
    results.rxjs = measureTimeAverage(() => {
        const instances = []; let start, end;
        start = performance.now(); for (let i = 0; i < COMP_INSTANCE_COUNT; i++) { const instance = new Subject(); const subscriptions = []; for (let j = 0; j < COMP_INITIAL_LISTENERS; j++) subscriptions.push(instance.subscribe(() => {})); instances.push({ instance, subscriptions }); } end = performance.now(); rxjsPhaseTimes.phase1 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) item.instance.next(i); end = performance.now(); rxjsPhaseTimes.phase2 += (end - start);
        start = performance.now(); const midPoint = Math.floor(COMP_INSTANCE_COUNT / 2); for (let i = 0; i < COMP_INSTANCE_COUNT; i++) { if (i < midPoint) { for (let j = 0; j < COMP_ADD_LISTENERS; j++) instances[i].subscriptions.push(instances[i].instance.subscribe(() => {})); } else { for (let j = 0; j < COMP_REMOVE_LISTENERS; j++) if (instances[i].subscriptions.length > 0) instances[i].subscriptions.pop().unsubscribe(); } } end = performance.now(); rxjsPhaseTimes.phase3 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) item.instance.next(i + COMP_EMIT_COUNT); end = performance.now(); rxjsPhaseTimes.phase4 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_INSTANCE_COUNT; i++) for (let j = 0; j < COMP_FINAL_ADD_LISTENERS; j++) instances[i].subscriptions.push(instances[i].instance.subscribe(() => {})); end = performance.now(); rxjsPhaseTimes.phase5 += (end - start);
        start = performance.now(); for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) item.instance.next(i + COMP_EMIT_COUNT * 2); end = performance.now(); rxjsPhaseTimes.phase6 += (end - start);
    }, 3);
    phaseResults.rxjs = { phase1: rxjsPhaseTimes.phase1 / 3, phase2: rxjsPhaseTimes.phase2 / 3, phase3: rxjsPhaseTimes.phase3 / 3, phase4: rxjsPhaseTimes.phase4 / 3, phase5: rxjsPhaseTimes.phase5 / 3, phase6: rxjsPhaseTimes.phase6 / 3 }; // Use dot notation

    // --- Log Phase Timings Table ---
    const phaseColumns = [
        { header: 'Phase 1 (Init)', key: 'phase1', pad: 16, formatFn: formatResult },
        { header: 'Phase 2 (Emit 1)', key: 'phase2', pad: 16, formatFn: formatResult },
        { header: 'Phase 3 (Add/Rem)', key: 'phase3', pad: 17, formatFn: formatResult },
        { header: 'Phase 4 (Emit 2)', key: 'phase4', pad: 16, formatFn: formatResult },
        { header: 'Phase 5 (Add)', key: 'phase5', pad: 15, formatFn: formatResult },
        { header: 'Phase 6 (Emit 3)', key: 'phase6', pad: 16, formatFn: formatResult },
    ];
    // Map internal keys to display names for the table
    const phaseTableData = {};
    // Use a defined order for the table rows
    const libDisplayOrder = ['mono-event', 'EventEmitter3', 'mitt', 'nanoevents', 'Node Events', 'EventTarget', 'RxJS'];
    for (const libName of libDisplayOrder) {
        let libKey;
        if (libName === 'mono-event') libKey = 'mono';
        else if (libName === 'EventEmitter3') libKey = 'ee3';
        else if (libName === 'Node Events') libKey = 'nodeEvents';
        else if (libName === 'EventTarget') libKey = 'eventTarget';
        else libKey = libName.toLowerCase(); // mitt, nanoevents, rxjs

        if (phaseResults[libKey]) {
            // Pass the phase result object directly to generateBenchmarkTable
            phaseTableData[libName] = phaseResults[libKey];
        }
    }

    // フェーズタイミングデータを返す（テーブル表示はbenchmark.jsで行う）
    results.phaseResults = phaseResults;
    results.libDisplayOrder = libDisplayOrder;
    results.phaseColumns = phaseColumns;

    // Return total times for the main summary
    return results;
}