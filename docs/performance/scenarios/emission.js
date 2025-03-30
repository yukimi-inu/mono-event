import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter } from 'node:events'; // Removed setMaxListeners import
import { mono, monoRestrict } from 'mono-event'; // Use package name
import { measureTimeAverage } from '../utils.js';

/**
 * Runs the event emission benchmark.
 * @param {object} config Configuration object with LISTENER_COUNT and ITERATIONS.
 * @returns {object} Results object { mono, restrict, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runEmissionBenchmark(config) {
  const { LISTENER_COUNT, ITERATIONS } = config;
  const results = {};
  let counter = 0; // Used in handlers to prevent dead code elimination
  const handlers = [];
  for (let i = 0; i < LISTENER_COUNT; i++) {
    handlers.push(() => {
      counter += i;
    });
  }

  const eventObj = new Event('event'); // Reusable Event object for EventTarget
  const runs = 3; // Number of runs for averaging

  // mono-event
  const monoEmitEvent = mono();
  for (let i = 0; i < LISTENER_COUNT; i++) monoEmitEvent.add(handlers[i]);
  results.mono = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) monoEmitEvent.emit();
  }, runs);

  // monoRestrict
  const { event: restrictEvent, emit: restrictEmit } = monoRestrict();
  for (let i = 0; i < LISTENER_COUNT; i++) restrictEvent.add(handlers[i]);
  results.restrict = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) restrictEmit();
  }, runs);

  // EventEmitter3
  const ee3Emit = new EventEmitter3();
  for (let i = 0; i < LISTENER_COUNT; i++) ee3Emit.on('event', handlers[i]);
  results.ee3 = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) ee3Emit.emit('event');
  }, runs);

  // mitt
  const mittEmit = mitt();
  for (let i = 0; i < LISTENER_COUNT; i++) mittEmit.on('event', handlers[i]);
  results.mitt = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) mittEmit.emit('event');
  }, runs);

  // nanoevents
  const nanoEmit = createNanoEvents();
  for (let i = 0; i < LISTENER_COUNT; i++) nanoEmit.on('event', handlers[i]);
  results.nano = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) nanoEmit.emit('event');
  }, runs);

  // RxJS
  const rxjsEmit = new Subject();
  for (let i = 0; i < LISTENER_COUNT; i++) rxjsEmit.subscribe(handlers[i]);
  results.rxjs = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) rxjsEmit.next();
  }, runs);

  // node:events
  const nodeEmitterEmit = new EventEmitter();
  // nodeEmitterEmit.setMaxListeners(0); // Removed setMaxListeners
  for (let i = 0; i < LISTENER_COUNT; i++) nodeEmitterEmit.on('event', handlers[i]);
  results.nodeEvents = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) nodeEmitterEmit.emit('event');
  }, runs);

  // EventTarget
  const eventTargetEmit = new EventTarget();
  // setMaxListeners(0, eventTargetEmit); // Removed setMaxListeners
  for (let i = 0; i < LISTENER_COUNT; i++) eventTargetEmit.addEventListener('event', handlers[i]);
  results.eventTarget = measureTimeAverage(() => {
    counter = 0;
    for (let i = 0; i < ITERATIONS; i++) eventTargetEmit.dispatchEvent(eventObj);
  }, runs);

  return results;
}
