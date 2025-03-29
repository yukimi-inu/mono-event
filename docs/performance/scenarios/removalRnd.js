import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Ensure setMaxListeners is imported
import { mono } from '../../../dist/index.min.js';
import { measureTimeAverage, shuffleArray } from '../utils.js'; // Use measureTimeAverage

/**
 * Runs the random listener removal benchmark.
 * @param {object} config Configuration object with REMOVAL_ITERATIONS.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runRemovalRndBenchmark(config) {
  const { REMOVAL_ITERATIONS } = config;
  const results = {};
  const runs = 3; // Number of runs for averaging

  // Helper function to setup and return handlers/removers for a library
  function setupListeners(createFn, addFn) {
    const instance = createFn();
    if (instance instanceof EventEmitter) instance.setMaxListeners(0);
    if (instance instanceof EventTarget) setMaxListeners(0, instance);
    const removers = [];
    const indices = [];
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      indices.push(i);
      const handler = () => {};
      const remover = addFn(instance, handler);
      removers.push({ handler, remover }); // Store handler and remover (unbind/subscription)
    }
    // Shuffle indices once per setup
    const shuffledIndices = shuffleArray(indices);
    return { instance, removers, shuffledIndices };
  }

  // mono-event
  results.mono = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => mono(),
      (inst, h) => inst.add(h),
    );
    for (const index of shuffledIndices) instance.remove(removers[index].handler);
  }, runs);

  // EventEmitter3
  results.ee3 = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => new EventEmitter3(),
      (inst, h) => inst.on('event', h),
    );
    for (const index of shuffledIndices) instance.off('event', removers[index].handler);
  }, runs);

  // mitt
  results.mitt = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => mitt(),
      (inst, h) => inst.on('event', h),
    );
    for (const index of shuffledIndices) instance.off('event', removers[index].handler);
  }, runs);

  // nanoevents
  results.nano = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => createNanoEvents(),
      (inst, h) => inst.on('event', h),
    );
    for (const index of shuffledIndices) removers[index].remover(); // Call the unbind function
  }, runs);

  // RxJS
  results.rxjs = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => new Subject(),
      (inst, h) => inst.subscribe(h),
    );
    for (const index of shuffledIndices) removers[index].remover.unsubscribe(); // Call unsubscribe
  }, runs);

  // node:events
  results.nodeEvents = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => new EventEmitter(),
      (inst, h) => inst.on('event', h),
    );
    for (const index of shuffledIndices) instance.off('event', removers[index].handler);
  }, runs);

  // EventTarget
  results.eventTarget = measureTimeAverage(() => {
    const { instance, removers, shuffledIndices } = setupListeners(
      () => new EventTarget(),
      (inst, h) => inst.addEventListener('event', h),
    );
    for (const index of shuffledIndices) instance.removeEventListener('event', removers[index].handler);
  }, runs);

  return results;
}
