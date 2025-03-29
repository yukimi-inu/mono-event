import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter } from 'node:events'; // Import Node's EventEmitter
import { mono } from '../../../dist/index.min.js';
import { measureTimeAverage } from '../utils.js';

/**
 * Runs the initialization benchmark.
 * @param {object} config Configuration object with ITERATIONS.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runInitializationBenchmark(config) {
  const { ITERATIONS } = config;
  const results = {};

  results.mono = measureTimeAverage(() => {
    for (let i = 0; i < ITERATIONS; i++) mono();
  });
  results.ee3 = measureTimeAverage(() => {
    for (let i = 0; i < ITERATIONS; i++) new EventEmitter3();
  });
  results.mitt = measureTimeAverage(() => {
    for (let i = 0; i < ITERATIONS; i++) mitt();
  });
  results.nano = measureTimeAverage(() => {
    for (let i = 0; i < ITERATIONS; i++) createNanoEvents();
  });
  results.rxjs = measureTimeAverage(() => {
    for (let i = 0; i < ITERATIONS; i++) new Subject();
  });
  results.nodeEvents = measureTimeAverage(() => {
    // Added node:events
    for (let i = 0; i < ITERATIONS; i++) new EventEmitter();
  });
  results.eventTarget = measureTimeAverage(() => {
    // Added EventTarget
    for (let i = 0; i < ITERATIONS; i++) new EventTarget();
  });

  return results;
}
