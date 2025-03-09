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

// Benchmark configuration
const ITERATIONS = 500000; // Number of iterations for each test
const LISTENER_COUNT = 500; // Number of listeners to attach
const REMOVAL_ITERATIONS = 10000; // Reduced iterations for removal tests to avoid memory issues

console.log('\n=== Event Libraries Performance Benchmark ===');
console.log(`Iterations: ${formatNumber(ITERATIONS)}`);
console.log(`Listeners per event: ${LISTENER_COUNT}`);
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

// ===== Listener Registration Benchmark =====
console.log('\n----- Listener Registration Time (add only) (average of 3 runs) -----');

// mono-event
const monoEvent = mono();
const monoRegisterTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {
    };
    monoEvent.add(handler);
  }
});
console.log(`mono-event: ${monoRegisterTime.toFixed(3)} ms`);

// EventEmitter3
const ee3 = new EventEmitter3();
const ee3RegisterTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {
    };
    ee3.on('event', handler);
  }
});
console.log(`EventEmitter3: ${ee3RegisterTime.toFixed(3)} ms`);

// mitt
const mittEmitter = mitt();
const mittRegisterTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {
    };
    mittEmitter.on('event', handler);
  }
});
console.log(`mitt: ${mittRegisterTime.toFixed(3)} ms`);

// nanoevents
const nanoEmitter = createNanoEvents();
const nanoRegisterTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {
    };
    nanoEmitter.on('event', handler);
  }
});
console.log(`nanoevents: ${nanoRegisterTime.toFixed(3)} ms`);

// RxJS
const rxjsSubject = new Subject();
const rxjsRegisterTime = measureTimeAverage(() => {
  for (let i = 0; i < ITERATIONS; i++) {
    const handler = () => {
    };
    const subscription = rxjsSubject.subscribe(handler);
    // Note: We're not unsubscribing here to match the behavior of other libraries in this test
  }
});
console.log(`RxJS: ${rxjsRegisterTime.toFixed(3)} ms`);

// ===== Listener Removal Benchmark =====
console.log('\n----- Listener Removal Time (average of 3 runs) -----');

// Function to setup and run removal benchmark
function runRemovalBenchmark() {
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
    const handler = () => {
    };
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

  // mono-event
  const monoRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      monoRemoveEvent.remove(handlers.mono[i]);
    }
  });

  // EventEmitter3
  const ee3RemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      ee3Remove.off('event', handlers.ee3[i]);
    }
  });

  // mitt
  const mittRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      mittRemove.off('event', handlers.mitt[i]);
    }
  });

  // nanoevents
  const nanoRemoveTime = measureTime(() => {
    for (let i = 0; i < REMOVAL_ITERATIONS; i++) {
      handlers.nano[i]();
    }
  });

  // RxJS
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
let totalMonoRemoveTime = 0;
let totalEe3RemoveTime = 0;
let totalMittRemoveTime = 0;
let totalNanoRemoveTime = 0;
let totalRxjsRemoveTime = 0;

for (let i = 0; i < 3; i++) {
  const results = runRemovalBenchmark();
  totalMonoRemoveTime += results.mono;
  totalEe3RemoveTime += results.ee3;
  totalMittRemoveTime += results.mitt;
  totalNanoRemoveTime += results.nano;
  totalRxjsRemoveTime += results.rxjs;
}

const monoRemoveTime = totalMonoRemoveTime / 3;
const ee3RemoveTime = totalEe3RemoveTime / 3;
const mittRemoveTime = totalMittRemoveTime / 3;
const nanoRemoveTime = totalNanoRemoveTime / 3;
const rxjsRemoveTime = totalRxjsRemoveTime / 3;

console.log(`mono-event: ${monoRemoveTime.toFixed(3)} ms`);
console.log(`EventEmitter3: ${ee3RemoveTime.toFixed(3)} ms`);
console.log(`mitt: ${mittRemoveTime.toFixed(3)} ms`);
console.log(`nanoevents: ${nanoRemoveTime.toFixed(3)} ms`);
console.log(`RxJS: ${rxjsRemoveTime.toFixed(3)} ms`);

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
const ONCE_LISTENER_COUNT = 10000; // 50,000 listeners for once test
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
    rxjsEmitOnce.subscribe(onceHandler).add(() => {
      // This is the RxJS equivalent of 'once'
      rxjsEmitOnce.unsubscribe();
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
console.log('\n----- Memory Usage -----');

// Function to measure memory usage for a specific operation
function measureMemoryUsage(createFn, count = 10000) {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage().heapUsed;
  const instances = [];

  for (let i = 0; i < count; i++) {
    instances.push(createFn());
  }

  const endMemory = process.memoryUsage().heapUsed;
  const used = endMemory - startMemory;

  return {
    total: used,
    perInstance: used / count,
  };
}

// Only run memory tests if --expose-gc flag is used
if (global.gc) {
  const monoMemory = measureMemoryUsage(() => mono());
  const ee3Memory = measureMemoryUsage(() => new EventEmitter3());
  const mittMemory = measureMemoryUsage(() => mitt());
  const nanoMemory = measureMemoryUsage(() => createNanoEvents());
  const rxjsMemory = measureMemoryUsage(() => new Subject());

  console.log(`mono-event: ${(monoMemory.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`EventEmitter3: ${(ee3Memory.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`mitt: ${(mittMemory.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`nanoevents: ${(nanoMemory.perInstance / 1024).toFixed(2)} KB per instance`);
  console.log(`RxJS: ${(rxjsMemory.perInstance / 1024).toFixed(2)} KB per instance`);
} else {
  console.log('Memory usage test skipped. Run with --expose-gc flag to enable.');
}

// ===== Summary =====
console.log('\n----- Performance Summary (lower is better) -----');
console.log(`
  | Library          | Init (ms) | Register (ms) | Remove (ms) | Emit (ms) | Emit Once (ms) |
  |------------------|-----------|---------------|-------------|-----------|----------------|
  | mono-event       | ${monoInitTime.toFixed(3).padStart(9)} | ${monoRegisterTime.toFixed(3).padStart(13)} | ${monoRemoveTime.toFixed(3).padStart(11)} | ${monoEmitTime.toFixed(3).padStart(9)} | ${monoEmitOnceTime.toFixed(3).padStart(14)} |
  |  Restrict        | ${'-'.padStart(9)} | ${'-'.padStart(13)} | ${'-'.padStart(11)} | ${restrictEmitTime.toFixed(3).padStart(9)} | ${'-'.padStart(14)} |
  | EventEmitter3    | ${ee3InitTime.toFixed(3).padStart(9)} | ${ee3RegisterTime.toFixed(3).padStart(13)} | ${ee3RemoveTime.toFixed(3).padStart(11)} | ${ee3EmitTime.toFixed(3).padStart(9)} | ${ee3EmitOnceTime.toFixed(3).padStart(14)} |
  | mitt             | ${mittInitTime.toFixed(3).padStart(9)} | ${mittRegisterTime.toFixed(3).padStart(13)} | ${mittRemoveTime.toFixed(3).padStart(11)} | ${mittEmitTime.toFixed(3).padStart(9)} | ${mittEmitOnceTime.toFixed(3).padStart(14)} |
  | nanoevents       | ${nanoInitTime.toFixed(3).padStart(9)} | ${nanoRegisterTime.toFixed(3).padStart(13)} | ${nanoRemoveTime.toFixed(3).padStart(11)} | ${nanoEmitTime.toFixed(3).padStart(9)} | ${nanoEmitOnceTime.toFixed(3).padStart(14)} |
  | RxJS             | ${rxjsInitTime.toFixed(3).padStart(9)} | ${rxjsRegisterTime.toFixed(3).padStart(13)} | ${rxjsRemoveTime.toFixed(3).padStart(11)} | ${rxjsEmitTime.toFixed(3).padStart(9)} | ${rxjsEmitOnceTime.toFixed(3).padStart(14)} |
`);
