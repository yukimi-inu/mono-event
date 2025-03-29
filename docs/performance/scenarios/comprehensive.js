import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import { mono } from '../../../dist/index.min.js';
import { measureTimeAverage, formatResult } from '../utils.js'; // Removed unused imports

/**
 * Converts a library display name to its internal key used in results objects.
 * @param {string} libName The display name of the library.
 * @returns {string} The internal key for the library.
 */
function getLibKey(libName) {
  switch (libName) {
    case 'mono-event':
      return 'mono';
    case 'Restrict':
      return 'restrict'; // Although not used here, keep for consistency
    case 'EventEmitter3':
      return 'ee3';
    case 'nanoevents':
      return 'nano';
    case 'Node Events':
      return 'nodeEvents';
    case 'EventTarget':
      return 'eventTarget';
    default:
      return libName.toLowerCase(); // mitt, rxjs
  }
}

/**
 * Runs the comprehensive benchmark scenario simulating a more realistic usage pattern.
 * @param {object} config Configuration object with COMP_INSTANCE_COUNT, etc.
 * @returns {object} Results object containing total times and phase timings.
 */
export function runComprehensiveBenchmark(config) {
  const {
    COMP_INSTANCE_COUNT,
    COMP_INITIAL_LISTENERS,
    COMP_ADD_LISTENERS,
    COMP_REMOVE_LISTENERS,
    COMP_FINAL_ADD_LISTENERS,
    COMP_EMIT_COUNT,
  } = config;
  const results = {};
  const eventObj = new Event('event'); // Reusable Event object for EventTarget
  const phaseResults = {}; // Store phase timings for all libs (keyed by internal lib key)
  const runs = 3; // Number of runs for averaging

  // --- Scenario Runner with Phase Timing Collection ---
  function runComprehensiveScenarioWithTiming(libKey, createFn, addFn, removeFn, emitFn, addOnceFn) {
    const phaseTimes = { phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, phase6: 0, phase7: 0 };

    const totalTime = measureTimeAverage(() => {
      const instances = [];
      let start;
      let end;

      // Phase 1: Create instances and add initial listeners
      start = performance.now();
      for (let i = 0; i < COMP_INSTANCE_COUNT; i++) {
        const instance = createFn();
        // Adjust max listeners for Node Events and EventTarget if necessary
        if (instance instanceof EventEmitter) instance.setMaxListeners(0);
        // Note: Standard EventTarget doesn't have setMaxListeners, but Node's implementation might.
        // If using Node's EventTarget specifically, you might need:
        // if (typeof setMaxListeners === 'function' && instance instanceof EventTarget) setMaxListeners(0, instance);
        const handlers = []; // Store handlers/unbinds/subscriptions
        for (let j = 0; j < COMP_INITIAL_LISTENERS; j++) {
          const h = () => {
            void j;
          };
          const remover = addFn(instance, h); // addFn might return a remover
          handlers.push({ handler: h, remover }); // Store both if needed
        }
        instances.push({ instance, handlers });
      }
      end = performance.now();
      phaseTimes.phase1 += end - start;

      // Phase 2: Emit first time
      start = performance.now();
      for (let i = 0; i < COMP_EMIT_COUNT; i++) for (const item of instances) emitFn(item.instance, i);
      end = performance.now();
      phaseTimes.phase2 += end - start;

      // Phase 3: Add/Remove listeners
      start = performance.now();
      const midPoint = Math.floor(COMP_INSTANCE_COUNT / 2);
      for (let i = 0; i < COMP_INSTANCE_COUNT; i++) {
        if (i < midPoint) {
          // Add listeners
          for (let j = 0; j < COMP_ADD_LISTENERS; j++) {
            const h = () => {
              void j;
            };
            const remover = addFn(instances[i].instance, h);
            instances[i].handlers.push({ handler: h, remover });
          }
        } else {
          // Remove listeners
          for (let j = 0; j < COMP_REMOVE_LISTENERS; j++) {
            if (instances[i].handlers.length > 0) {
              const idx = Math.floor(Math.random() * instances[i].handlers.length);
              const { handler, remover } = instances[i].handlers.splice(idx, 1)[0];
              removeFn(instances[i].instance, handler, remover); // Pass remover if needed
            }
          }
        }
      }
      end = performance.now();
      phaseTimes.phase3 += end - start;

      // Phase 4: Emit second time
      start = performance.now();
      for (let i = 0; i < COMP_EMIT_COUNT; i++)
        for (const item of instances) emitFn(item.instance, i + COMP_EMIT_COUNT);
      end = performance.now();
      phaseTimes.phase4 += end - start;

      // Phase 5: Add final listeners
      start = performance.now();
      for (let i = 0; i < COMP_INSTANCE_COUNT; i++) {
        for (let j = 0; j < COMP_FINAL_ADD_LISTENERS; j++) {
          const h = () => {
            void i;
          };
          const remover = addFn(instances[i].instance, h);
          instances[i].handlers.push({ handler: h, remover });
        }
      }
      end = performance.now();
      phaseTimes.phase5 += end - start;

      // Phase 6: Emit third time
      start = performance.now();
      for (let i = 0; i < COMP_EMIT_COUNT; i++)
        for (const item of instances) emitFn(item.instance, i + COMP_EMIT_COUNT * 2);
      end = performance.now();
      phaseTimes.phase6 += end - start;

      // Phase 7: Add once listeners and emit (repeated cycles)
      start = performance.now();
      const onceCycles = 3;
      const onceListenersPerCycle = Math.ceil(COMP_INITIAL_LISTENERS / 2);
      const emitsPerCycle = Math.ceil(COMP_EMIT_COUNT / 3);

      for (let cycle = 0; cycle < onceCycles; cycle++) {
        // Add once listeners
        for (let i = 0; i < COMP_INSTANCE_COUNT; i++) {
          for (let j = 0; j < onceListenersPerCycle; j++) {
            const h = () => {
              void i;
              void j;
            };
            addOnceFn(instances[i].instance, h);
          }
        }
        // Emit to trigger once listeners
        for (let i = 0; i < emitsPerCycle; i++) {
          for (const item of instances) {
            emitFn(item.instance, i + COMP_EMIT_COUNT * 3 + cycle * emitsPerCycle);
          }
        }
      }
      end = performance.now();
      phaseTimes.phase7 += end - start;
    }, runs);

    // Store average phase times
    phaseResults[libKey] = {
      phase1: phaseTimes.phase1 / runs,
      phase2: phaseTimes.phase2 / runs,
      phase3: phaseTimes.phase3 / runs,
      phase4: phaseTimes.phase4 / runs,
      phase5: phaseTimes.phase5 / runs,
      phase6: phaseTimes.phase6 / runs,
      phase7: phaseTimes.phase7 / runs,
    };
    return totalTime; // Return total average time
  }

  // --- Run for each library ---
  results.mono = runComprehensiveScenarioWithTiming(
    'mono',
    () => mono(),
    (inst, h) => inst.add(h), // Returns remover
    (inst, h, remover) => remover(), // Use remover
    (inst, data) => inst.emit(data),
    (inst, h) => inst.add(h, { once: true }),
  );

  results.ee3 = runComprehensiveScenarioWithTiming(
    'ee3',
    () => new EventEmitter3(),
    (inst, h) => inst.on('event', h), // Returns instance
    (inst, h) => inst.off('event', h),
    (inst, data) => inst.emit('event', data),
    (inst, h) => inst.once('event', h),
  );

  results.mitt = runComprehensiveScenarioWithTiming(
    'mitt',
    () => mitt(),
    (inst, h) => inst.on('event', h), // No return
    (inst, h) => inst.off('event', h),
    (inst, data) => inst.emit('event', data),
    (inst, h) => {
      // Manual once
      const wrapper = (e) => {
        h(e);
        inst.off('event', wrapper);
      };
      inst.on('event', wrapper);
    },
  );

  results.nano = runComprehensiveScenarioWithTiming(
    'nano',
    () => createNanoEvents(),
    (inst, h) => inst.on('event', h), // Returns unbind
    (inst, h, remover) => remover(), // Call unbind
    (inst, data) => inst.emit('event', data),
    (inst, h) => {
      // Manual once
      const unbind = inst.on('event', (e) => {
        unbind();
        h(e);
      });
    },
  );

  results.nodeEvents = runComprehensiveScenarioWithTiming(
    'nodeEvents',
    () => new EventEmitter(),
    (inst, h) => inst.on('event', h), // Returns instance
    (inst, h) => inst.off('event', h),
    (inst, data) => inst.emit('event', data),
    (inst, h) => inst.once('event', h),
  );

  results.eventTarget = runComprehensiveScenarioWithTiming(
    'eventTarget',
    () => new EventTarget(),
    (inst, h) => inst.addEventListener('event', h), // No return
    (inst, h) => inst.removeEventListener('event', h),
    (inst, data) => inst.dispatchEvent(eventObj), // Use reusable event object
    (inst, h) => inst.addEventListener('event', h, { once: true }),
  );

  results.rxjs = runComprehensiveScenarioWithTiming(
    'rxjs',
    () => new Subject(),
    (inst, h) => inst.subscribe(h), // Returns subscription
    (inst, h, remover) => remover.unsubscribe(), // Call unsubscribe
    (inst, data) => inst.next(data),
    (inst, h) => {
      // Manual once
      const subscription = inst.subscribe((d) => {
        subscription.unsubscribe();
        h(d);
      });
    },
  );

  // --- Prepare results for benchmark.js ---
  const phaseColumns = [
    { header: 'Phase 1 (Init)', key: 'phase1', pad: 16, formatFn: formatResult },
    { header: 'Phase 2 (Emit 1)', key: 'phase2', pad: 16, formatFn: formatResult },
    { header: 'Phase 3 (Add/Rem)', key: 'phase3', pad: 17, formatFn: formatResult },
    { header: 'Phase 4 (Emit 2)', key: 'phase4', pad: 16, formatFn: formatResult },
    { header: 'Phase 5 (Add)', key: 'phase5', pad: 15, formatFn: formatResult },
    { header: 'Phase 6 (Emit 3)', key: 'phase6', pad: 16, formatFn: formatResult },
    { header: 'Phase 7 (Once)', key: 'phase7', pad: 16, formatFn: formatResult },
  ];
  const libDisplayOrder = ['mono-event', 'EventEmitter3', 'mitt', 'nanoevents', 'Node Events', 'EventTarget', 'RxJS'];

  // Add phase results and metadata to the main results object
  results.phaseResults = phaseResults;
  results.libDisplayOrder = libDisplayOrder;
  results.phaseColumns = phaseColumns;

  // Return total times and phase data
  return results;
}
