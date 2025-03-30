import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter } from 'node:events'; // Removed setMaxListeners import
import { mono } from 'mono-event'; // Use package name
import { measureTimeAverage } from '../utils.js';

/**
 * Runs the multi-instance listener registration benchmark.
 * @param {object} config Configuration object with REGISTER_MULTI_INSTANCE_COUNT and LISTENERS_PER_MULTI_INSTANCE.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runRegisterMultiBenchmark(config) {
  const { REGISTER_MULTI_INSTANCE_COUNT, LISTENERS_PER_MULTI_INSTANCE } = config;
  const results = {};
  const handlers = [];
  for (let i = 0; i < LISTENERS_PER_MULTI_INSTANCE; i++) {
    handlers.push(() => {
      i; // Simple operation inside handler
    });
  }

  results.mono = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const event = mono();
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) event.add(handlers[j]);
    }
  });

  results.ee3 = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const emitter = new EventEmitter3();
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) emitter.on('event', handlers[j]);
    }
  });

  results.mitt = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const emitter = mitt();
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) emitter.on('event', handlers[j]);
    }
  });

  results.nano = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const emitter = createNanoEvents();
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) emitter.on('event', handlers[j]);
    }
  });

  results.rxjs = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const subject = new Subject();
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) subject.subscribe(handlers[j]);
    }
  });

  results.nodeEvents = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const emitter = new EventEmitter();
      // emitter.setMaxListeners(LISTENERS_PER_MULTI_INSTANCE + 1); // Removed setMaxListeners
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) emitter.on('event', handlers[j]);
    }
  });

  results.eventTarget = measureTimeAverage(() => {
    for (let i = 0; i < REGISTER_MULTI_INSTANCE_COUNT; i++) {
      const target = new EventTarget();
      // setMaxListeners(LISTENERS_PER_MULTI_INSTANCE + 1, target); // Removed setMaxListeners
      for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) target.addEventListener('event', handlers[j]);
    }
  });

  return results;
}
