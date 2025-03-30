import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter } from 'node:events'; // Removed setMaxListeners import
import { mono } from 'mono-event'; // Use package name
import { measureTimeAverage } from '../utils.js';

/**
 * Runs the backward listener removal benchmark.
 * @param {object} config Configuration object with REMOVAL_ITERATIONS.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runRemovalBwdBenchmark(config) {
  const { REMOVAL_ITERATIONS } = config;
  const results = {};
  const runs = 3; // Number of runs for averaging

  // Helper function to setup and return handlers/removers for a library
  function setupListeners(createFn, addFn) {
    const instance = createFn();
    // Removed setMaxListeners calls
    const removers = [];
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      const handler = () => {};
      const remover = addFn(instance, handler);
      removers.push({ handler, remover }); // Store handler and remover (unbind/subscription)
    }
    return { instance, removers };
  }

  // mono-event
  results.mono = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => mono(),
      (inst, h) => inst.add(h),
    );
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) instance.remove(removers[i].handler);
  }, runs);

  // EventEmitter3
  results.ee3 = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => new EventEmitter3(),
      (inst, h) => inst.on('event', h),
    );
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) instance.off('event', removers[i].handler);
  }, runs);

  // mitt
  results.mitt = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => mitt(),
      (inst, h) => inst.on('event', h),
    );
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) instance.off('event', removers[i].handler);
  }, runs);

  // nanoevents
  results.nano = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => createNanoEvents(),
      (inst, h) => inst.on('event', h),
    );
    // nanoevents returns an unbind function from on()
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) removers[i].remover();
  }, runs);

  // RxJS
  results.rxjs = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => new Subject(),
      (inst, h) => inst.subscribe(h), // subscribe returns a Subscription object
    );
    // RxJS subscription object has an unsubscribe method
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) removers[i].remover.unsubscribe();
  }, runs);

  // node:events
  results.nodeEvents = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => new EventEmitter(),
      (inst, h) => inst.on('event', h),
    );
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) instance.off('event', removers[i].handler);
  }, runs);

  // EventTarget
  results.eventTarget = measureTimeAverage(() => {
    const { instance, removers } = setupListeners(
      () => new EventTarget(),
      (inst, h) => inst.addEventListener('event', h),
    );
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) instance.removeEventListener('event', removers[i].handler);
  }, runs);

  return results;
}
