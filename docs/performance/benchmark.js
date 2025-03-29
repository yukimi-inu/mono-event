import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
// Performance benchmark for event libraries
import {mono, monoRestrict} from '../../dist/index.min.js';

// Utility functions to measure execution time
function measureTime(fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

// Run a measurement 3 times and return the average
function measureTimeAverage(fn, runs = 3) {
  let total = 0;
  for (let i = 0; i < runs; i++) {
    total += measureTime(fn);
  }
  return total / runs;
}

// Utility function to format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Fisher-Yates (aka Knuth) Shuffle
function shuffleArray(array) {
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


// Benchmark configuration
const ITERATIONS = 500000; // Number of iterations for registration/emission tests
const LISTENER_COUNT = 500; // Number of listeners for emission tests
const REMOVAL_ITERATIONS = 10000; // Iterations for removal tests
const MULTI_INSTANCE_COUNT = ITERATIONS / 10; // Number of instances for multi-instance registration test
const LISTENERS_PER_MULTI_INSTANCE = 10; // Listeners per instance for multi-instance registration test
const MEMORY_INSTANCE_COUNT = 10000; // Base number of instances for memory tests
const MEMORY_LISTENERS = 100; // Listeners per instance for memory test with listeners
const MEMORY_INSTANCE_COUNT_WITH_LISTENERS = MEMORY_INSTANCE_COUNT / 10; // Adjusted instance count for memory test with listeners

console.log('\n=== Event Libraries Performance Benchmark ===');
console.log(`Iterations (Register/Emit): ${formatNumber(ITERATIONS)}`);
console.log(`Listeners per event (Emit): ${LISTENER_COUNT}`);
console.log(`Removal Iterations: ${formatNumber(REMOVAL_ITERATIONS)}`);
console.log(`Multi-Instance Count (Register): ${formatNumber(MULTI_INSTANCE_COUNT)}`);
console.log(`Listeners per Multi-Instance (Register): ${LISTENERS_PER_MULTI_INSTANCE}`);
console.log(`Memory Instance Count: ${formatNumber(MEMORY_INSTANCE_COUNT)}`);
console.log(`Memory Listeners per Instance: ${MEMORY_LISTENERS}`);
console.log('\n');

// ===== Initialization Benchmark =====
console.log('----- Initialization Time (average of 3 runs) -----');

// mono-event
const monoInitTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const event = mono();
  }
});
console.log(`mono-event: ${monoInitTime.toFixed(3)} ms`);

// EventEmitter3
const ee3InitTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const emitter = new EventEmitter3();
  }
});
console.log(`EventEmitter3: ${ee3InitTime.toFixed(3)} ms`);

// mitt
const mittInitTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const emitter = mitt();
  }
});
console.log(`mitt: ${mittInitTime.toFixed(3)} ms`);

// nanoevents
const nanoInitTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const emitter = createNanoEvents();
  }
});
console.log(`nanoevents: ${nanoInitTime.toFixed(3)} ms`);

// RxJS
const rxjsInitTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const subject = new Subject();
  }
});
console.log(`RxJS: ${rxjsInitTime.toFixed(3)} ms`);

// ===== Listener Registration Benchmark (Single Instance) =====
console.log('\n----- Listener Registration Time (Single Instance) (average of 3 runs) -----');

// mono-event
const monoEventSingle = mono();
const monoRegisterSingleTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {};
    monoEventSingle.add(handler);
  }
});
console.log(`mono-event: ${monoRegisterSingleTime.toFixed(3)} ms`);

// EventEmitter3
const ee3Single = new EventEmitter3();
const ee3RegisterSingleTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {};
    ee3Single.on('event', handler);
  }
});
console.log(`EventEmitter3: ${ee3RegisterSingleTime.toFixed(3)} ms`);

// mitt
const mittEmitterSingle = mitt();
const mittRegisterSingleTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {};
    mittEmitterSingle.on('event', handler);
  }
});
console.log(`mitt: ${mittRegisterSingleTime.toFixed(3)} ms`);

// nanoevents
const nanoEmitterSingle = createNanoEvents();
const nanoRegisterSingleTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {};
    nanoEmitterSingle.on('event', handler);
  }
});
console.log(`nanoevents: ${nanoRegisterSingleTime.toFixed(3)} ms`);

// RxJS
const rxjsSubjectSingle = new Subject();
const rxjsRegisterSingleTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {};
    const subscription = rxjsSubjectSingle.subscribe(handler);
    // Note: We're not unsubscribing here to match the behavior of other libraries in this test
  }
});
console.log(`RxJS: ${rxjsRegisterSingleTime.toFixed(3)} ms`);


// ===== Listener Registration Benchmark (Multi-Instance) =====
console.log(`\n----- Listener Registration Time (Multi-Instance: ${formatNumber(MULTI_INSTANCE_COUNT)} instances, ${LISTENERS_PER_MULTI_INSTANCE} listeners each) (average of 3 runs) -----`);

// mono-event
const monoRegisterMultiTime = measureTimeAverage(() => {
  for (let i = 0; i < MULTI_INSTANCE_COUNT; i++) {
    const event = mono();
    for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) {
      const handler = () => {};
      event.add(handler);
    }
  }
});
console.log(`mono-event: ${monoRegisterMultiTime.toFixed(3)} ms`);

// EventEmitter3
const ee3RegisterMultiTime = measureTimeAverage(() => {
  for (let i = 0; i < MULTI_INSTANCE_COUNT; i++) {
    const emitter = new EventEmitter3();
    for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) {
      const handler = () => {};
      emitter.on('event', handler);
    }
  }
});
console.log(`EventEmitter3: ${ee3RegisterMultiTime.toFixed(3)} ms`);

// mitt
const mittRegisterMultiTime = measureTimeAverage(() => {
  for (let i = 0; i < MULTI_INSTANCE_COUNT; i++) {
    const emitter = mitt();
    for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) {
      const handler = () => {};
      emitter.on('event', handler);
    }
  }
});
console.log(`mitt: ${mittRegisterMultiTime.toFixed(3)} ms`);

// nanoevents
const nanoRegisterMultiTime = measureTimeAverage(() => {
  for (let i = 0; i < MULTI_INSTANCE_COUNT; i++) {
    const emitter = createNanoEvents();
    for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) {
      const handler = () => {};
      emitter.on('event', handler);
    }
  }
});
console.log(`nanoevents: ${nanoRegisterMultiTime.toFixed(3)} ms`);

// RxJS
const rxjsRegisterMultiTime = measureTimeAverage(() => {
  for (let i = 0; i < MULTI_INSTANCE_COUNT; i++) {
    const subject = new Subject();
    for (let j = 0; j < LISTENERS_PER_MULTI_INSTANCE; j++) {
      const handler = () => {};
      const subscription = subject.subscribe(handler);
    }
  }
});
console.log(`RxJS: ${rxjsRegisterMultiTime.toFixed(3)} ms`);


// ===== Listener Removal Benchmark (Forward) =====
console.log('\n----- Listener Removal Time (Forward) (average of 3 runs) -----');

// Function to setup and run removal benchmark
function runRemovalBenchmarkForward() {
  // Setup for removal tests
  const handlers = {
    mono: [],
    ee3: [],
    mitt: [],
    nano: [],
    rxjs: [],
  };

  // Prepare handlers for removal
  const monoRemoveEvent = mono();
  const ee3Remove = new EventEmitter3();
  const mittRemove = mitt();
  const nanoRemove = createNanoEvents();
  const rxjsRemove = new Subject();

  for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
    const handler = () => {};
    handlers.mono.push(handler);
    monoRemoveEvent.add(handler);

    handlers.ee3.push(handler);
    ee3Remove.on('event', handler);

    handlers.mitt.push(handler);
    mittRemove.on('event', handler);

    // For nanoevents, we need to store the unbind functions
    const unbind = nanoRemove.on('event', handler);
    handlers.nano.push(unbind);

    // For RxJS, we need to store the subscription objects
    const subscription = rxjsRemove.subscribe(handler);
    handlers.rxjs.push(subscription);
  }

  // mono-event (Forward removal)
  const monoRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      monoRemoveEvent.remove(handlers.mono[i]);
    }
  });

  // EventEmitter3 (Forward removal)
  const ee3RemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      ee3Remove.off('event', handlers.ee3[i]);
    }
  });

  // mitt (Forward removal)
  const mittRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      mittRemove.off('event', handlers.mitt[i]);
    }
  });

  // nanoevents (Forward removal)
  const nanoRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      handlers.nano[i]();
    }
  });

  // RxJS (Forward removal)
  const rxjsRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      handlers.rxjs[i].unsubscribe();
    }
  });

  return {
    mono: monoRemoveTime,
    ee3: ee3RemoveTime,
    mitt: mittRemoveTime,
    nano: nanoRemoveTime,
    rxjs: rxjsRemoveTime
  };
}

// Run removal benchmark 3 times and average the results
let totalMonoRemoveFwdTime = 0;
let totalEe3RemoveFwdTime = 0;
let totalMittRemoveFwdTime = 0;
let totalNanoRemoveFwdTime = 0;
let totalRxjsRemoveFwdTime = 0;

for (let i = 0; i < 3; i++) {
  const results = runRemovalBenchmarkForward();
  totalMonoRemoveFwdTime += results.mono;
  totalEe3RemoveFwdTime += results.ee3;
  totalMittRemoveFwdTime += results.mitt;
  totalNanoRemoveFwdTime += results.nano;
  totalRxjsRemoveFwdTime += results.rxjs;
}

const monoRemoveFwdTime = totalMonoRemoveFwdTime / 3;
const ee3RemoveFwdTime = totalEe3RemoveFwdTime / 3;
const mittRemoveFwdTime = totalMittRemoveFwdTime / 3;
const nanoRemoveFwdTime = totalNanoRemoveFwdTime / 3;
const rxjsRemoveFwdTime = totalRxjsRemoveFwdTime / 3;

console.log(`mono-event: ${monoRemoveFwdTime.toFixed(3)} ms`);
console.log(`EventEmitter3: ${ee3RemoveFwdTime.toFixed(3)} ms`);
console.log(`mitt: ${mittRemoveFwdTime.toFixed(3)} ms`);
console.log(`nanoevents: ${nanoRemoveFwdTime.toFixed(3)} ms`);
console.log(`RxJS: ${rxjsRemoveFwdTime.toFixed(3)} ms`);


// ===== Listener Removal Benchmark (Backward) =====
console.log('\n----- Listener Removal Time (Backward) (average of 3 runs) -----');

// Function to setup and run removal benchmark (Backward)
function runRemovalBenchmarkBackward() {
  // Setup for removal tests
  const handlers = {
    mono: [],
    ee3: [],
    mitt: [],
    nano: [],
    rxjs: [],
  };

  // Prepare handlers for removal
  const monoRemoveEvent = mono();
  const ee3Remove = new EventEmitter3();
  const mittRemove = mitt();
  const nanoRemove = createNanoEvents();
  const rxjsRemove = new Subject();

  for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
    const handler = () => {};
    handlers.mono.push(handler);
    monoRemoveEvent.add(handler);

    handlers.ee3.push(handler);
    ee3Remove.on('event', handler);

    handlers.mitt.push(handler);
    mittRemove.on('event', handler);

    // For nanoevents, we need to store the unbind functions
    const unbind = nanoRemove.on('event', handler);
    handlers.nano.push(unbind);

    // For RxJS, we need to store the subscription objects
    const subscription = rxjsRemove.subscribe(handler);
    handlers.rxjs.push(subscription);
  }

  // mono-event (Backward removal)
  const monoRemoveTime = measureTime(() => {
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) {
      monoRemoveEvent.remove(handlers.mono[i]);
    }
  });

  // EventEmitter3 (Backward removal)
  const ee3RemoveTime = measureTime(() => {
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) {
      ee3Remove.off('event', handlers.ee3[i]);
    }
  });

  // mitt (Backward removal)
  const mittRemoveTime = measureTime(() => {
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) {
      mittRemove.off('event', handlers.mitt[i]);
    }
  });

  // nanoevents (Backward removal)
  const nanoRemoveTime = measureTime(() => {
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) {
      handlers.nano[i]();
    }
  });

  // RxJS (Backward removal)
  const rxjsRemoveTime = measureTime(() => {
    for (let i = REMOVAL_ITERATIONS - 1; i >= 0; i--) {
      handlers.rxjs[i].unsubscribe();
    }
  });

  return {
    mono: monoRemoveTime,
    ee3: ee3RemoveTime,
    mitt: mittRemoveTime,
    nano: nanoRemoveTime,
    rxjs: rxjsRemoveTime
  };
}

// Run removal benchmark 3 times and average the results
let totalMonoRemoveBwdTime = 0;
let totalEe3RemoveBwdTime = 0;
let totalMittRemoveBwdTime = 0;
let totalNanoRemoveBwdTime = 0;
let totalRxjsRemoveBwdTime = 0;

for (let i = 0; i < 3; i++) {
  const results = runRemovalBenchmarkBackward();
  totalMonoRemoveBwdTime += results.mono;
  totalEe3RemoveBwdTime += results.ee3;
  totalMittRemoveBwdTime += results.mitt;
  totalNanoRemoveBwdTime += results.nano;
  totalRxjsRemoveBwdTime += results.rxjs;
}

const monoRemoveBwdTime = totalMonoRemoveBwdTime / 3;
const ee3RemoveBwdTime = totalEe3RemoveBwdTime / 3;
const mittRemoveBwdTime = totalMittRemoveBwdTime / 3;
const nanoRemoveBwdTime = totalNanoRemoveBwdTime / 3;
const rxjsRemoveBwdTime = totalRxjsRemoveBwdTime / 3;

console.log(`mono-event: ${monoRemoveBwdTime.toFixed(3)} ms`);
console.log(`EventEmitter3: ${ee3RemoveBwdTime.toFixed(3)} ms`);
console.log(`mitt: ${mittRemoveBwdTime.toFixed(3)} ms`);
console.log(`nanoevents: ${nanoRemoveBwdTime.toFixed(3)} ms`);
console.log(`RxJS: ${rxjsRemoveBwdTime.toFixed(3)} ms`);


// ===== Listener Removal Benchmark (Random) =====
console.log('\n----- Listener Removal Time (Random) (average of 3 runs) -----');

// Function to setup and run removal benchmark (Random)
function runRemovalBenchmarkRandom() {
  // Setup for removal tests
  const handlers = {
    mono: [],
    ee3: [],
    mitt: [],
    nano: [],
    rxjs: [],
  };

  // Prepare handlers for removal
  const monoRemoveEvent = mono();
  const ee3Remove = new EventEmitter3();
  const mittRemove = mitt();
  const nanoRemove = createNanoEvents();
  const rxjsRemove = new Subject();

  // Create indices array to shuffle
  const indices = [];
  for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
    indices.push(i);
    const handler = () => {};
    handlers.mono.push(handler);
    monoRemoveEvent.add(handler);

    handlers.ee3.push(handler);
    ee3Remove.on('event', handler);

    handlers.mitt.push(handler);
    mittRemove.on('event', handler);

    // For nanoevents, we need to store the unbind functions
    const unbind = nanoRemove.on('event', handler);
    handlers.nano.push(unbind);

    // For RxJS, we need to store the subscription objects
    const subscription = rxjsRemove.subscribe(handler);
    handlers.rxjs.push(subscription);
  }

  // Shuffle the indices - use the same shuffled order for all libraries
  const shuffledIndices = shuffleArray([...indices]); // Clone indices before shuffling

  // mono-event (Random removal)
  const monoRemoveTime = measureTime(() => {
    for (const index of shuffledIndices) {
      monoRemoveEvent.remove(handlers.mono[index]);
    }
  });

  // EventEmitter3 (Random removal)
  const ee3RemoveTime = measureTime(() => {
    for (const index of shuffledIndices) {
      ee3Remove.off('event', handlers.ee3[index]);
    }
  });

  // mitt (Random removal)
  const mittRemoveTime = measureTime(() => {
    for (const index of shuffledIndices) {
      mittRemove.off('event', handlers.mitt[index]);
    }
  });

  // nanoevents (Random removal)
  const nanoRemoveTime = measureTime(() => {
    for (const index of shuffledIndices) {
      handlers.nano[index]();
    }
  });

  // RxJS (Random removal)
  const rxjsRemoveTime = measureTime(() => {
    for (const index of shuffledIndices) {
      handlers.rxjs[index].unsubscribe();
    }
  });

  return {
    mono: monoRemoveTime,
    ee3: ee3RemoveTime,
    mitt: mittRemoveTime,
    nano: nanoRemoveTime,
    rxjs: rxjsRemoveTime
  };
}

// Run removal benchmark 3 times and average the results
let totalMonoRemoveRndTime = 0;
let totalEe3RemoveRndTime = 0;
let totalMittRemoveRndTime = 0;
let totalNanoRemoveRndTime = 0;
let totalRxjsRemoveRndTime = 0;

for (let i = 0; i < 3; i++) {
  const results = runRemovalBenchmarkRandom();
  totalMonoRemoveRndTime += results.mono;
  totalEe3RemoveRndTime += results.ee3;
  totalMittRemoveRndTime += results.mitt;
  totalNanoRemoveRndTime += results.nano;
  totalRxjsRemoveRndTime += results.rxjs;
}

const monoRemoveRndTime = totalMonoRemoveRndTime / 3;
const ee3RemoveRndTime = totalEe3RemoveRndTime / 3;
const mittRemoveRndTime = totalMittRemoveRndTime / 3;
const nanoRemoveRndTime = totalNanoRemoveRndTime / 3;
const rxjsRemoveRndTime = totalRxjsRemoveRndTime / 3;

console.log(`mono-event: ${monoRemoveRndTime.toFixed(3)} ms`);
console.log(`EventEmitter3: ${ee3RemoveRndTime.toFixed(3)} ms`);
console.log(`mitt: ${mittRemoveRndTime.toFixed(3)} ms`);
console.log(`nanoevents: ${nanoRemoveRndTime.toFixed(3)} ms`);
console.log(`RxJS: ${rxjsRemoveRndTime.toFixed(3)} ms`);


// ===== Event Emission Benchmark =====
console.log(`\n----- Event Emission Time (${LISTENER_COUNT} listeners) (average of 3 runs) -----`);

// Function to setup and run emission benchmark
function runEmissionBenchmark() {
  // Setup for emission tests
  let counter = 0;
  const handler = () => {
    counter++;
  };

  // mono-event
  counter = 0;
  const monoEmitEvent = mono();
  for (let i = 0; i < LISTENER_COUNT; i++) {
    monoEmitEvent.add(handler);
  }
  const monoEmitTime = measureTime(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      monoEmitEvent.emit();
    }
  });

  // monoRestrict
  counter = 0;
  const {event: restrictEvent, emit: restrictEmit} = monoRestrict();
  for (let i = 0; i < LISTENER_COUNT; i++) {
    restrictEvent.add(handler);
  }
  const restrictEmitTime = measureTime(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      restrictEmit();
    }
  });

  // EventEmitter3
  counter = 0;
  const ee3Emit = new EventEmitter3();
  for (let i = 0; i < LISTENER_COUNT; i++) {
    ee3Emit.on('event', handler);
  }
  const ee3EmitTime = measureTime(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      ee3Emit.emit('event');
    }
  });

  // mitt
  counter = 0;
  const mittEmit = mitt();
  for (let i = 0; i < LISTENER_COUNT; i++) {
    mittEmit.on('event', handler);
  }
  const mittEmitTime = measureTime(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      mittEmit.emit('event');
    }
  });

  // nanoevents
  counter = 0;
  const nanoEmit = createNanoEvents();
  for (let i = 0; i < LISTENER_COUNT; i++) {
    nanoEmit.on('event', handler);
  }
  const nanoEmitTime = measureTime(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      nanoEmit.emit('event');
    }
  });

  // RxJS
  counter = 0;
  const rxjsEmit = new Subject();
  for (let i = 0; i < LISTENER_COUNT; i++) {
    rxjsEmit.subscribe(handler);
  }
  const rxjsEmitTime = measureTime(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      rxjsEmit.next();
    }
  });

  return {
    mono: monoEmitTime,
    restrict: restrictEmitTime,
    ee3: ee3EmitTime,
    mitt: mittEmitTime,
    nano: nanoEmitTime,
    rxjs: rxjsEmitTime
  };
}

// Run emission benchmark 3 times and average the results
let totalMonoEmitTime = 0;
let totalRestrictEmitTime = 0;
let totalEe3EmitTime = 0;
let totalMittEmitTime = 0;
let totalNanoEmitTime = 0;
let totalRxjsEmitTime = 0;

for (let i = 0; i < 3; i++) {
  const results = runEmissionBenchmark();
  totalMonoEmitTime += results.mono;
  totalRestrictEmitTime += results.restrict;
  totalEe3EmitTime += results.ee3;
  totalMittEmitTime += results.mitt;
  totalNanoEmitTime += results.nano;
  totalRxjsEmitTime += results.rxjs;
}

const monoEmitTime = totalMonoEmitTime / 3;
const restrictEmitTime = totalRestrictEmitTime / 3;
const ee3EmitTime = totalEe3EmitTime / 3;
const mittEmitTime = totalMittEmitTime / 3;
const nanoEmitTime = totalNanoEmitTime / 3;
const rxjsEmitTime = totalRxjsEmitTime / 3;

console.log(`mono-event: ${monoEmitTime.toFixed(3)} ms`);
console.log(`mono(Restrict): ${restrictEmitTime.toFixed(3)} ms`);
console.log(`EventEmitter3: ${ee3EmitTime.toFixed(3)} ms`);
console.log(`mitt: ${mittEmitTime.toFixed(3)} ms`);
console.log(`nanoevents: ${nanoEmitTime.toFixed(3)} ms`);
console.log(`RxJS: ${rxjsEmitTime.toFixed(3)} ms`);

// ===== Event Emission with Once Listeners Benchmark =====
// For once listeners, we use a single iteration with many listeners
const ONCE_LISTENER_COUNT = 10000; // 10,000 listeners for once test
console.log(`\n----- Event Emission Time with Once Listeners (${ONCE_LISTENER_COUNT} listeners, 1 iteration) (average of 3 runs) -----`);

// Function to setup and run once emission benchmark
function runOnceEmissionBenchmark() {
  // Setup for emission tests with once listeners
  let onceCounter = 0;
  const onceHandler = () => {
    onceCounter++;
  };

  // mono-event
  onceCounter = 0;
  const monoEmitOnceEvent = mono();
  for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
    monoEmitOnceEvent.add(onceHandler, {once: true});
  }
  const monoEmitOnceTime = measureTime(() => {
    // Only one iteration for once listeners
    monoEmitOnceEvent.emit();
  });

  // EventEmitter3
  onceCounter = 0;
  const ee3EmitOnce = new EventEmitter3();
  for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
    ee3EmitOnce.once('event', onceHandler);
  }
  const ee3EmitOnceTime = measureTime(() => {
    // Only one iteration for once listeners
    ee3EmitOnce.emit('event');
  });

  // mitt (Note: mitt doesn't have built-in once functionality)
  onceCounter = 0;
  const mittEmitOnce = mitt();
  // We'll simulate 'once' behavior for mitt
  const mittOnceHandlers = [];
  for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
    const wrappedHandler = (e) => {
      onceHandler(e);
      mittEmitOnce.off('event', wrappedHandler);
    };
    mittOnceHandlers.push(wrappedHandler);
    mittEmitOnce.on('event', wrappedHandler);
  }
  const mittEmitOnceTime = measureTime(() => {
    // Only one iteration for once listeners
    mittEmitOnce.emit('event');
  });

  // nanoevents (Note: nanoevents doesn't have built-in once functionality)
  onceCounter = 0;
  const nanoEmitOnce = createNanoEvents();
  // We'll simulate 'once' behavior for nanoevents using the recommended pattern
  const nanoUnbinds = [];
  for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
    const unbind = nanoEmitOnce.on('event', (e) => {
      unbind(); // First unbind to ensure removal even if handler throws
      onceHandler(e); // Then call the handler
    });
    nanoUnbinds.push(unbind);
  }
  const nanoEmitOnceTime = measureTime(() => {
    // Only one iteration for once listeners
    nanoEmitOnce.emit('event');
  });

  // RxJS
  onceCounter = 0;
  const rxjsEmitOnce = new Subject();
  for (let i = 0; i < ONCE_LISTENER_COUNT; i++) {
    // RxJS 'firstValueFrom' or 'take(1)' is closer, but for direct comparison:
    const subscription = rxjsEmitOnce.subscribe(data => {
        onceHandler(data);
        subscription.unsubscribe(); // Manual unsubscribe simulates 'once'
    });
  }
  const rxjsEmitOnceTime = measureTime(() => {
    // Only one iteration for once listeners
    rxjsEmitOnce.next();
  });


  return {
    mono: monoEmitOnceTime,
    ee3: ee3EmitOnceTime,
    mitt: mittEmitOnceTime,
    nano: nanoEmitOnceTime,
    rxjs: rxjsEmitOnceTime
  };
}

// Run once emission benchmark 3 times and average the results
let totalMonoEmitOnceTime = 0;
let totalEe3EmitOnceTime = 0;
let totalMittEmitOnceTime = 0;
let totalNanoEmitOnceTime = 0;
let totalRxjsEmitOnceTime = 0;

for (let i = 0; i < 3; i++) {
  const results = runOnceEmissionBenchmark();
  totalMonoEmitOnceTime += results.mono;
  totalEe3EmitOnceTime += results.ee3;
  totalMittEmitOnceTime += results.mitt;
  totalNanoEmitOnceTime += results.nano;
  totalRxjsEmitOnceTime += results.rxjs;
}

const monoEmitOnceTime = totalMonoEmitOnceTime / 3;
const ee3EmitOnceTime = totalEe3EmitOnceTime / 3;
const mittEmitOnceTime = totalMittEmitOnceTime / 3;
const nanoEmitOnceTime = totalNanoEmitOnceTime / 3;
const rxjsEmitOnceTime = totalRxjsEmitOnceTime / 3;

console.log(`mono-event: ${monoEmitOnceTime.toFixed(3)} ms`);
console.log(`EventEmitter3: ${ee3EmitOnceTime.toFixed(3)} ms`);
console.log(`mitt: ${mittEmitOnceTime.toFixed(3)} ms`);
console.log(`nanoevents: ${nanoEmitOnceTime.toFixed(3)} ms`);
console.log(`RxJS: ${rxjsEmitOnceTime.toFixed(3)} ms`);

// ===== Memory Usage =====
// Note: Memory usage tests require running Node with --expose-gc flag
console.log('\n----- Memory Usage (requires --expose-gc) -----');

// Function to measure memory usage for creating instances (no listeners)
function measureMemoryUsageEmpty(createFn, count = MEMORY_INSTANCE_COUNT) {
  // Force garbage collection if available
  if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  } else if (typeof Bun !== 'undefined' && Bun.gc) {
     Bun.gc(true); // Force GC in Bun
  }

  const startMemory = process.memoryUsage().heapUsed;
  const instances = [];

  for (let i = 0; i < count; i++) {
    instances.push(createFn());
  }

  const endMemory = process.memoryUsage().heapUsed;
  const used = endMemory - startMemory;

  // Clear instances to allow GC
  instances.length = 0;
   if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  } else if (typeof Bun !== 'undefined' && Bun.gc) {
     Bun.gc(true); // Force GC in Bun
  }

  return {
    total: used,
    perInstance: used / count,
  };
}

// Function to measure memory usage for creating instances with listeners
function measureMemoryUsageWithListeners(createFn, addListenerFn, listenerCount = MEMORY_LISTENERS, instanceCount = MEMORY_INSTANCE_COUNT_WITH_LISTENERS) {
  // Force garbage collection if available
  if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  } else if (typeof Bun !== 'undefined' && Bun.gc) {
     Bun.gc(true); // Force GC in Bun
  }

  const startMemory = process.memoryUsage().heapUsed;
  const instances = [];
  const handlers = []; // Create unique handlers to prevent unintended sharing/optimization
  for(let i = 0; i < listenerCount; i++) {
      handlers.push(() => {});
  }


  for (let i = 0; i < instanceCount; i++) {
    const instance = createFn();
    for (let j = 0; j < listenerCount; j++) {
        addListenerFn(instance, handlers[j]);
    }
    instances.push(instance);
  }

  const endMemory = process.memoryUsage().heapUsed;
  const used = endMemory - startMemory;

  // Clear instances to allow GC
  instances.length = 0;
  handlers.length = 0;
   if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  } else if (typeof Bun !== 'undefined' && Bun.gc) {
     Bun.gc(true); // Force GC in Bun
  }

  return {
    total: used,
    perInstance: used / instanceCount,
  };
}


// Only run memory tests if gc is available
let monoMemoryEmpty;
let ee3MemoryEmpty;
let mittMemoryEmpty;
let nanoMemoryEmpty;
let rxjsMemoryEmpty;
let monoMemoryWithListeners;
let ee3MemoryWithListeners;
let mittMemoryWithListeners;
let nanoMemoryWithListeners;
let rxjsMemoryWithListeners;
let memoryTestRun = false;

if ((typeof global !== 'undefined' && global.gc) || (typeof Bun !== 'undefined' && Bun.gc)) {
  memoryTestRun = true;
  console.log(`\n--- Memory Usage (Empty Instances, ${formatNumber(MEMORY_INSTANCE_COUNT)} instances) ---`);
  monoMemoryEmpty = measureMemoryUsageEmpty(() => mono());
  ee3MemoryEmpty = measureMemoryUsageEmpty(() => new EventEmitter3());
  mittMemoryEmpty = measureMemoryUsageEmpty(() => mitt());
  nanoMemoryEmpty = measureMemoryUsageEmpty(() => createNanoEvents());
  rxjsMemoryEmpty = measureMemoryUsageEmpty(() => new Subject());

  console.log(`mono-event: ${(monoMemoryEmpty.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`EventEmitter3: ${(ee3MemoryEmpty.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`mitt: ${(mittMemoryEmpty.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`nanoevents: ${(nanoMemoryEmpty.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`RxJS: ${(rxjsMemoryEmpty.perInstance / 1024).toFixed(2)} KB per instance`);

  console.log(`\n--- Memory Usage (With ${MEMORY_LISTENERS} Listeners, ${formatNumber(MEMORY_INSTANCE_COUNT_WITH_LISTENERS)} instances) ---`);
  monoMemoryWithListeners = measureMemoryUsageWithListeners(() => mono(), (inst, h) => inst.add(h));
  ee3MemoryWithListeners = measureMemoryUsageWithListeners(() => new EventEmitter3(), (inst, h) => inst.on('event', h));
  mittMemoryWithListeners = measureMemoryUsageWithListeners(() => mitt(), (inst, h) => inst.on('event', h));
  nanoMemoryWithListeners = measureMemoryUsageWithListeners(() => createNanoEvents(), (inst, h) => inst.on('event', h));
  rxjsMemoryWithListeners = measureMemoryUsageWithListeners(() => new Subject(), (inst, h) => inst.subscribe(h));

  console.log(`mono-event: ${(monoMemoryWithListeners.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`EventEmitter3: ${(ee3MemoryWithListeners.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`mitt: ${(mittMemoryWithListeners.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`nanoevents: ${(nanoMemoryWithListeners.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`RxJS: ${(rxjsMemoryWithListeners.perInstance / 1024).toFixed(2)} KB per instance`);

} else {
  console.log('Memory usage test skipped. Run with --expose-gc (Node) or ensure Bun version supports Bun.gc.');
}

// ===== Summary =====
console.log('\n----- Performance Summary (lower is better) -----');
// Adjust padding based on the longest number in each column
const padInit = 9;
const padRegSingle = 18; // Register (Single)
const padRegMulti = 17; // Register (Multi)
const padRemFwd = 17;
const padRemBwd = 17;
const padRemRnd = 17;
const padEmit = 9;
const padEmitOnce = 14;
const padMemEmpty = 16; // Memory (Empty)
const padMemListeners = 19; // Memory (Listeners)

console.log(`
  | Library          | Init (ms) | Register (Single) (ms) | Register (Multi) (ms) | Remove (Fwd) (ms) | Remove (Bwd) (ms) | Remove (Rnd) (ms) | Emit (ms) | Emit Once (ms) | Memory (Empty) (KB/inst) | Memory (${MEMORY_LISTENERS} Listeners) (KB/inst) |
  |------------------|-----------|--------------------------|-----------------------|-------------------|-------------------|-------------------|-----------|----------------|--------------------------|------------------------------------|
  | mono-event       | ${monoInitTime.toFixed(3).padStart(padInit)} | ${monoRegisterSingleTime.toFixed(3).padStart(padRegSingle)} | ${monoRegisterMultiTime.toFixed(3).padStart(padRegMulti)} | ${monoRemoveFwdTime.toFixed(3).padStart(padRemFwd)} | ${monoRemoveBwdTime.toFixed(3).padStart(padRemBwd)} | ${monoRemoveRndTime.toFixed(3).padStart(padRemRnd)} | ${monoEmitTime.toFixed(3).padStart(padEmit)} | ${monoEmitOnceTime.toFixed(3).padStart(padEmitOnce)} | ${memoryTestRun ? (monoMemoryEmpty.perInstance / 1024).toFixed(2).padStart(padMemEmpty) : 'N/A'.padStart(padMemEmpty)} | ${memoryTestRun ? (monoMemoryWithListeners.perInstance / 1024).toFixed(2).padStart(padMemListeners) : 'N/A'.padStart(padMemListeners)} |
  |  Restrict        | ${'-'.padStart(padInit)} | ${'-'.padStart(padRegSingle)} | ${'-'.padStart(padRegMulti)} | ${'-'.padStart(padRemFwd)} | ${'-'.padStart(padRemBwd)} | ${'-'.padStart(padRemRnd)} | ${restrictEmitTime.toFixed(3).padStart(padEmit)} | ${'-'.padStart(padEmitOnce)} | ${'-'.padStart(padMemEmpty)} | ${'-'.padStart(padMemListeners)} |
  | EventEmitter3    | ${ee3InitTime.toFixed(3).padStart(padInit)} | ${ee3RegisterSingleTime.toFixed(3).padStart(padRegSingle)} | ${ee3RegisterMultiTime.toFixed(3).padStart(padRegMulti)} | ${ee3RemoveFwdTime.toFixed(3).padStart(padRemFwd)} | ${ee3RemoveBwdTime.toFixed(3).padStart(padRemBwd)} | ${ee3RemoveRndTime.toFixed(3).padStart(padRemRnd)} | ${ee3EmitTime.toFixed(3).padStart(padEmit)} | ${ee3EmitOnceTime.toFixed(3).padStart(padEmitOnce)} | ${memoryTestRun ? (ee3MemoryEmpty.perInstance / 1024).toFixed(2).padStart(padMemEmpty) : 'N/A'.padStart(padMemEmpty)} | ${memoryTestRun ? (ee3MemoryWithListeners.perInstance / 1024).toFixed(2).padStart(padMemListeners) : 'N/A'.padStart(padMemListeners)} |
  | mitt             | ${mittInitTime.toFixed(3).padStart(padInit)} | ${mittRegisterSingleTime.toFixed(3).padStart(padRegSingle)} | ${mittRegisterMultiTime.toFixed(3).padStart(padRegMulti)} | ${mittRemoveFwdTime.toFixed(3).padStart(padRemFwd)} | ${mittRemoveBwdTime.toFixed(3).padStart(padRemBwd)} | ${mittRemoveRndTime.toFixed(3).padStart(padRemRnd)} | ${mittEmitTime.toFixed(3).padStart(padEmit)} | ${mittEmitOnceTime.toFixed(3).padStart(padEmitOnce)} | ${memoryTestRun ? (mittMemoryEmpty.perInstance / 1024).toFixed(2).padStart(padMemEmpty) : 'N/A'.padStart(padMemEmpty)} | ${memoryTestRun ? (mittMemoryWithListeners.perInstance / 1024).toFixed(2).padStart(padMemListeners) : 'N/A'.padStart(padMemListeners)} |
  | nanoevents       | ${nanoInitTime.toFixed(3).padStart(padInit)} | ${nanoRegisterSingleTime.toFixed(3).padStart(padRegSingle)} | ${nanoRegisterMultiTime.toFixed(3).padStart(padRegMulti)} | ${nanoRemoveFwdTime.toFixed(3).padStart(padRemFwd)} | ${nanoRemoveBwdTime.toFixed(3).padStart(padRemBwd)} | ${nanoRemoveRndTime.toFixed(3).padStart(padRemRnd)} | ${nanoEmitTime.toFixed(3).padStart(padEmit)} | ${nanoEmitOnceTime.toFixed(3).padStart(padEmitOnce)} | ${memoryTestRun ? (nanoMemoryEmpty.perInstance / 1024).toFixed(2).padStart(padMemEmpty) : 'N/A'.padStart(padMemEmpty)} | ${memoryTestRun ? (nanoMemoryWithListeners.perInstance / 1024).toFixed(2).padStart(padMemListeners) : 'N/A'.padStart(padMemListeners)} |
  | RxJS             | ${rxjsInitTime.toFixed(3).padStart(padInit)} | ${rxjsRegisterSingleTime.toFixed(3).padStart(padRegSingle)} | ${rxjsRegisterMultiTime.toFixed(3).padStart(padRegMulti)} | ${rxjsRemoveFwdTime.toFixed(3).padStart(padRemFwd)} | ${rxjsRemoveBwdTime.toFixed(3).padStart(padRemBwd)} | ${rxjsRemoveRndTime.toFixed(3).padStart(padRemRnd)} | ${rxjsEmitTime.toFixed(3).padStart(padEmit)} | ${rxjsEmitOnceTime.toFixed(3).padStart(padEmitOnce)} | ${memoryTestRun ? (rxjsMemoryEmpty.perInstance / 1024).toFixed(2).padStart(padMemEmpty) : 'N/A'.padStart(padMemEmpty)} | ${memoryTestRun ? (rxjsMemoryWithListeners.perInstance / 1024).toFixed(2).padStart(padMemListeners) : 'N/A'.padStart(padMemListeners)} |
`);
