import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { EventEmitter, setMaxListeners } from 'node:events'; // Import setMaxListeners
import { mono } from '../../../dist/index.min.js';
import { measureTimeAverage } from '../utils.js'; // Use measureTimeAverage

/**
 * Runs the event emission benchmark for 'once' listeners.
 * @param {object} config Configuration object with ONCE_LISTENER_COUNT.
 * @returns {object} Results object { mono, ee3, mitt, nano, rxjs, nodeEvents, eventTarget }.
 */
export function runEmissionOnceBenchmark(config) {
  const { ONCE_LISTENER_COUNT } = config;
  const results = {};
  let onceCounter = 0; // Used in handlers
  const handlers = [];
  for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
    handlers.push(() => {
      onceCounter += i;
    });
  }

  const eventObj = new Event('event'); // Reusable Event object for EventTarget
  const runs = 3; // Number of runs for averaging

  // mono-event
  results.mono = measureTimeAverage(() => {
    onceCounter = 0;
    const monoEmitOnceEvent = mono();
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++) monoEmitOnceEvent.add(handlers[i], { once: true });
    monoEmitOnceEvent.emit(); // Emit once to trigger listeners
  }, runs);

  // EventEmitter3
  results.ee3 = measureTimeAverage(() => {
    onceCounter = 0;
    const ee3EmitOnce = new EventEmitter3();
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++) ee3EmitOnce.once('event', handlers[i]);
    ee3EmitOnce.emit('event');
  }, runs);

  // mitt
  results.mitt = measureTimeAverage(() => {
    onceCounter = 0;
    const mittEmitOnce = mitt();
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
      const wrapper = (e) => {
        handlers[i](e);
        mittEmitOnce.off('event', wrapper);
      };
      mittEmitOnce.on('event', wrapper);
    }
    mittEmitOnce.emit('event');
  }, runs);

  // nanoevents
  results.nano = measureTimeAverage(() => {
    onceCounter = 0;
    const nanoEmitOnce = createNanoEvents();
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
      const unbind = nanoEmitOnce.on('event', (e) => {
        unbind();
        handlers[i](e);
      });
    }
    nanoEmitOnce.emit('event');
  }, runs);

  // RxJS
  results.rxjs = measureTimeAverage(() => {
    onceCounter = 0;
    const rxjsEmitOnce = new Subject();
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
      const subscription = rxjsEmitOnce.subscribe((d) => {
        handlers[i](d);
        subscription.unsubscribe();
      });
    }
    rxjsEmitOnce.next();
  }, runs);

  // node:events
  results.nodeEvents = measureTimeAverage(() => {
    onceCounter = 0;
    const nodeEmitterOnce = new EventEmitter();
    nodeEmitterOnce.setMaxListeners(0);
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++) nodeEmitterOnce.once('event', handlers[i]);
    nodeEmitterOnce.emit('event');
  }, runs);

  // EventTarget
  results.eventTarget = measureTimeAverage(() => {
    onceCounter = 0;
    const eventTargetOnce = new EventTarget();
    setMaxListeners(0, eventTargetOnce);
    for (let i = 0; i < ONCE_LISTENER_COUNT; i++)
      eventTargetOnce.addEventListener('event', handlers[i], { once: true });
    eventTargetOnce.dispatchEvent(eventObj);
  }, runs);

  return results;
}
