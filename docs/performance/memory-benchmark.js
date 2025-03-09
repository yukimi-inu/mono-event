import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import {createNanoEvents} from 'nanoevents';
import {Subject} from 'rxjs';
// Memory usage benchmark for event libraries
import {mono} from '../../dist/index.min.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Utility function to format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Utility function to format memory size
function formatMemory(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

// Utility function to format memory size with commas
function formatMemoryWithCommas(bytes) {
  const kb = bytes / 1024;
  return `${formatNumber(kb.toFixed(2))} KB`;
}

// Function to format memory with stability info
function formatMemoryWithStability(memory, count = 1) {
  const value = count > 1 ? memory.total / count : memory.total;
  const cv = (memory.stdDev / value) * 100; // Coefficient of variation
  return `${formatMemory(value)} (CV: ${cv.toFixed(1)}%)`;
}

// Function to format memory with stability info and commas
function formatMemoryWithStabilityAndCommas(memory, count = 1) {
  const value = count > 1 ? memory.total / count : memory.total;
  const cv = (memory.stdDev / value) * 100; // Coefficient of variation
  return `${formatMemoryWithCommas(value)} (CV: ${cv.toFixed(1)}%)`;
}

// Utility function to format file size
function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Function to get minified bundle size
function getBundleSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return 0;
  }
}

// Function to get gzipped size
function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    return gzipped.length;
  } catch (error) {
    console.error(`Error calculating gzipped size for ${filePath}:`, error.message);
    return 0;
  }
}

// Function to find package size from package.json
function getPackageSize(packageName) {
  try {
    const packageJsonPath = path.join(rootDir, 'node_modules', packageName, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Try to find the main minified file
    let mainFile;
    if (packageJson.unpkg) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.unpkg);
    } else if (packageJson.jsdelivr) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.jsdelivr);
    } else if (packageJson.browser) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.browser);
    } else if (packageJson.main) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.main);
    } else {
      mainFile = path.join(rootDir, 'node_modules', packageName, 'index.js');
    }

    if (fs.existsSync(mainFile)) {
      return {
        path: mainFile,
        size: getBundleSize(mainFile),
        gzippedSize: getGzippedSize(mainFile),
      };
    }

    // If main file not found, try common patterns
    const possiblePaths = [
      path.join(rootDir, 'node_modules', packageName, 'dist', `${packageName}.min.js`),
      path.join(rootDir, 'node_modules', packageName, 'dist', 'index.min.js'),
      path.join(rootDir, 'node_modules', packageName, 'umd', `${packageName}.min.js`),
      path.join(rootDir, 'node_modules', packageName, 'lib', 'index.js'),
      path.join(rootDir, 'node_modules', packageName, 'index.js'),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return {
          path: possiblePath,
          size: getBundleSize(possiblePath),
          gzippedSize: getGzippedSize(possiblePath),
        };
      }
    }

    return {path: null, size: 0, gzippedSize: 0};
  } catch (error) {
    console.error(`Error getting package size for ${packageName}:`, error.message);
    return {path: null, size: 0, gzippedSize: 0};
  }
}

// Function to measure memory usage for a specific operation with multiple runs
function measureMemoryUsage(fn, runs = 5) {
  // Increased runs for more stability
  // Array to store memory usage results
  const measurements = [];
  let result;

  // Allocate a large array to stabilize memory before measurements
  const stabilizeMemory = new Array(1000000).fill(0);

  // Run multiple times to get more stable results
  for (let i = 0; i < runs; i++) {
    // Force garbage collection before measurement
    if (global.gc) {
      global.gc();
      global.gc(); // Run twice to be more thorough
      global.gc(); // Run a third time for good measure
    }

    // Wait for system to stabilize
    const stabilizeStart = Date.now();
    while (Date.now() - stabilizeStart < 100) {
      // Increased wait time
      // Busy wait to ensure GC has time to run
    }

    // Measure memory before creating objects
    const beforeMemory = process.memoryUsage();
    const startMemory = beforeMemory.heapUsed;

    // Execute the function that creates objects
    let createdObjects;
    if (i === 0) {
      createdObjects = fn(); // Only keep the result from the first run
      result = createdObjects;
    } else {
      createdObjects = fn(); // Just run the function for measurement
    }

    // Ensure objects are not garbage collected during measurement
    // by accessing them in some way
    if (Array.isArray(createdObjects)) {
      // Touch the array to ensure it's not optimized away
      for (let j = 0; j < Math.min(createdObjects.length, 10); j++) {
        if (createdObjects[j] === null) {
          console.log('This should never happen, just preventing optimization');
        }
      }
    }

    // Measure memory after creating objects
    const afterMemory = process.memoryUsage();
    const endMemory = afterMemory.heapUsed;

    // Calculate memory used
    const used = endMemory - startMemory;

    // Only add positive measurements
    if (used > 0) {
      measurements.push(used);
    }

    // Wait between measurements
    const waitStart = Date.now();
    while (Date.now() - waitStart < 200) {
      // Increased wait time
      // Busy wait to ensure measurements are independent
    }

    // Force garbage collection after measurement to clean up
    if (global.gc) {
      global.gc();
      global.gc();
    }

    // Clear reference to created objects to allow GC
    createdObjects = null;
  }

  // Clear stabilization memory
  stabilizeMemory.length = 0;

  // Sort measurements to remove outliers
  measurements.sort((a, b) => a - b);

  // Remove highest and lowest values if we have at least 4 measurements
  let validMeasurements;
  if (measurements.length >= 4) {
    validMeasurements = measurements.slice(1, -1);
  } else {
    validMeasurements = measurements;
  }

  // Calculate average
  const sum = validMeasurements.reduce((acc, val) => acc + val, 0);
  const average = sum / validMeasurements.length;

  return {
    total: average,
    result,
    min: Math.min(...measurements),
    max: Math.max(...measurements),
    stdDev: calculateStdDev(validMeasurements, average),
  };
}

// Calculate standard deviation
function calculateStdDev(values, mean) {
  if (values.length <= 1) return 0;

  const variance =
      values.reduce((acc, val) => {
        const diff = val - mean;
        return acc + diff * diff;
      }, 0) / values.length;

  return Math.sqrt(variance);
}

console.log('\n=== Event Libraries Memory Usage Benchmark ===\n');

// Check if --expose-gc flag is used
if (!global.gc) {
  console.error('This benchmark requires the --expose-gc flag to be enabled.');
  console.error('Please run with: node --expose-gc docs/performance/memory-benchmark.js');
  process.exit(1);
}

// ===== Scenario 1: Basic Memory Usage (1 instance) =====
console.log('===== Scenario 1: Basic Memory Usage (1 instance) =====');

const COUNT = 5000; // Number of instances to create for accurate measurement (調整済み)

console.log(`Creating ${formatNumber(COUNT)} instances of each library to measure average memory usage per instance\n`);

// mono-event
const monoMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < COUNT; i++) {
    instances.push(mono());
  }
  return instances;
});

// EventEmitter3
const ee3Memory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < COUNT; i++) {
    instances.push(new EventEmitter3());
  }
  return instances;
});

// mitt
const mittMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < COUNT; i++) {
    instances.push(mitt());
  }
  return instances;
});

// nanoevents
const nanoMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < COUNT; i++) {
    instances.push(createNanoEvents());
  }
  return instances;
});

// RxJS
const rxjsMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < COUNT; i++) {
    instances.push(new Subject());
  }
  return instances;
});

console.log('Memory usage per instance:');
console.log(`mono-event: ${formatMemoryWithStabilityAndCommas(monoMemory, COUNT)}`);
console.log(`EventEmitter3: ${formatMemoryWithStabilityAndCommas(ee3Memory, COUNT)}`);
console.log(`mitt: ${formatMemoryWithStabilityAndCommas(mittMemory, COUNT)}`);
console.log(`nanoevents: ${formatMemoryWithStabilityAndCommas(nanoMemory, COUNT)}`);
console.log(`RxJS: ${formatMemoryWithStabilityAndCommas(rxjsMemory, COUNT)}`);

// ===== Scenario 2: Memory Usage with 500 Handlers =====
console.log('\n===== Scenario 2: Memory Usage with 500 Handlers =====');

const HANDLER_COUNT = 500; // Number of handlers to register (調整済み)

// Create a dummy handler function
const dummyHandler = () => {
};

// mono-event with 1000 handlers
const monoWithHandlersMemory = measureMemoryUsage(() => {
  const instance = mono();
  for (let i = 0; i < HANDLER_COUNT; i++) {
    instance.add(dummyHandler);
  }
  return instance;
});

// EventEmitter3 with 1000 handlers
const ee3WithHandlersMemory = measureMemoryUsage(() => {
  const instance = new EventEmitter3();
  for (let i = 0; i < HANDLER_COUNT; i++) {
    instance.on('event', dummyHandler);
  }
  return instance;
});

// mitt with 1000 handlers
const mittWithHandlersMemory = measureMemoryUsage(() => {
  const instance = mitt();
  for (let i = 0; i < HANDLER_COUNT; i++) {
    instance.on('event', dummyHandler);
  }
  return instance;
});

// nanoevents with 1000 handlers
const nanoWithHandlersMemory = measureMemoryUsage(() => {
  const instance = createNanoEvents();
  for (let i = 0; i < HANDLER_COUNT; i++) {
    instance.on('event', dummyHandler);
  }
  return instance;
});

// RxJS with 1000 handlers
const rxjsWithHandlersMemory = measureMemoryUsage(() => {
  const instance = new Subject();
  for (let i = 0; i < HANDLER_COUNT; i++) {
    instance.subscribe(dummyHandler);
  }
  return instance;
});

console.log(`Memory usage for 1 instance with ${formatNumber(HANDLER_COUNT)} handlers:`);
console.log(`mono-event: ${formatMemoryWithStabilityAndCommas(monoWithHandlersMemory)}`);
console.log(`EventEmitter3: ${formatMemoryWithStabilityAndCommas(ee3WithHandlersMemory)}`);
console.log(`mitt: ${formatMemoryWithStabilityAndCommas(mittWithHandlersMemory)}`);
console.log(`nanoevents: ${formatMemoryWithStabilityAndCommas(nanoWithHandlersMemory)}`);
console.log(`RxJS: ${formatMemoryWithStabilityAndCommas(rxjsWithHandlersMemory)}`);

// ===== Scenario 3: Multiple Events vs Multiple Instances =====
console.log('\n===== Scenario 3: Multiple Events vs Multiple Instances =====');

const EVENT_COUNT = 1000;
const INSTANCE_COUNT = 100;
const MONO_INSTANCE_COUNT = EVENT_COUNT * INSTANCE_COUNT;

// Other libraries: 1000 events × 10 instances
const ee3MultipleEventsMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const emitter = new EventEmitter3();
    for (let j = 0; j < EVENT_COUNT; j++) {
      emitter.on(`event${j}`, dummyHandler);
    }
    instances.push(emitter);
  }
  return instances;
});

const mittMultipleEventsMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const emitter = mitt();
    for (let j = 0; j < EVENT_COUNT; j++) {
      emitter.on(`event${j}`, dummyHandler);
    }
    instances.push(emitter);
  }
  return instances;
});

const nanoMultipleEventsMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const emitter = createNanoEvents();
    for (let j = 0; j < EVENT_COUNT; j++) {
      emitter.on(`event${j}`, dummyHandler);
    }
    instances.push(emitter);
  }
  return instances;
});

// RxJS with multiple events
const rxjsMultipleEventsMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const subjects = {};
    for (let j = 0; j < EVENT_COUNT; j++) {
      subjects[`event${j}`] = new Subject();
      subjects[`event${j}`].subscribe(dummyHandler);
    }
    instances.push(subjects);
  }
  return instances;
});

// mono-event: 10000 instances (equivalent to 1000 events × 10 instances)
const monoMultipleInstancesMemory = measureMemoryUsage(() => {
  const instances = [];
  for (let i = 0; i < MONO_INSTANCE_COUNT; i++) {
    const emitter = mono();
    emitter.add(dummyHandler);
    instances.push(emitter);
  }
  return instances;
});

console.log(
    `Memory comparison for ${formatNumber(EVENT_COUNT)} events × ${formatNumber(INSTANCE_COUNT)} instances vs ${formatNumber(MONO_INSTANCE_COUNT)} mono-event instances:`,
);
console.log(
    `EventEmitter3 (${formatNumber(EVENT_COUNT)} events × ${formatNumber(INSTANCE_COUNT)} instances): ${formatMemoryWithStabilityAndCommas(ee3MultipleEventsMemory)}`,
);
console.log(
    `mitt (${formatNumber(EVENT_COUNT)} events × ${formatNumber(INSTANCE_COUNT)} instances): ${formatMemoryWithStabilityAndCommas(mittMultipleEventsMemory)}`,
);
console.log(
    `nanoevents (${formatNumber(EVENT_COUNT)} events × ${formatNumber(INSTANCE_COUNT)} instances): ${formatMemoryWithStabilityAndCommas(nanoMultipleEventsMemory)}`,
);
console.log(
    `RxJS (${formatNumber(EVENT_COUNT)} events × ${formatNumber(INSTANCE_COUNT)} instances): ${formatMemoryWithStabilityAndCommas(rxjsMultipleEventsMemory)}`,
);
console.log(`mono-event (${formatNumber(MONO_INSTANCE_COUNT)} instances): ${formatMemoryWithStabilityAndCommas(monoMultipleInstancesMemory)}`);

// ===== Bundle Size Benchmark =====
console.log('\n===== Bundle Size Benchmark =====');

// Define libraries to measure
const libraries = {
  'mono-event': {path: path.join(rootDir, 'dist', 'index.min.js')},
  eventemitter3: {package: 'eventemitter3'},
  mitt: {package: 'mitt'},
  nanoevents: {package: 'nanoevents'},
  rxjs: {package: 'rxjs'},
};

// Measure bundle sizes
const bundleSizes = {};

for (const [library, info] of Object.entries(libraries)) {
  let size = 0;
  let gzippedSize = 0;
  let filePath = '';

  if (info.path) {
    // Direct path provided
    filePath = info.path;
    size = getBundleSize(filePath);
    gzippedSize = getGzippedSize(filePath);
  } else if (info.package) {
    // Find package in node_modules
    const packageInfo = getPackageSize(info.package);
    size = packageInfo.size;
    gzippedSize = packageInfo.gzippedSize;
    filePath = packageInfo.path || 'Not found';
  }

  bundleSizes[library] = {size, gzippedSize, filePath};
}

console.log('| Library      | Minified Size | Gzipped Size |');
console.log('|--------------|---------------|--------------|');

for (const [library, info] of Object.entries(bundleSizes)) {
  console.log(
      `| ${library.padEnd(12)} | ${formatSize(info.size).padEnd(13)} | ${formatSize(info.gzippedSize).padEnd(12)} |`,
  );
}

// ===== Memory Usage Summary =====
console.log('\n===== Memory Usage Summary =====');

console.log(`
| Library      | Per Instance | With ${formatNumber(HANDLER_COUNT)} Handlers | ${formatNumber(EVENT_COUNT)} Events × ${formatNumber(INSTANCE_COUNT)} Instances | Bundle Size | Gzipped Size |
|--------------|--------------|-----------------|--------------------------|-------------|--------------|
| mono-event   | ${formatMemoryWithStabilityAndCommas(monoMemory, COUNT)} | ${formatMemoryWithStabilityAndCommas(monoWithHandlersMemory)} | ${formatMemoryWithStabilityAndCommas(monoMultipleInstancesMemory)} (${formatNumber(MONO_INSTANCE_COUNT)} instances) | ${formatSize(bundleSizes['mono-event'].size)} | ${formatSize(bundleSizes['mono-event'].gzippedSize)} |
| EventEmitter3| ${formatMemoryWithStabilityAndCommas(ee3Memory, COUNT)} | ${formatMemoryWithStabilityAndCommas(ee3WithHandlersMemory)} | ${formatMemoryWithStabilityAndCommas(ee3MultipleEventsMemory)} | ${formatSize(bundleSizes.eventemitter3.size)} | ${formatSize(bundleSizes.eventemitter3.gzippedSize)} |
| mitt         | ${formatMemoryWithStabilityAndCommas(mittMemory, COUNT)} | ${formatMemoryWithStabilityAndCommas(mittWithHandlersMemory)} | ${formatMemoryWithStabilityAndCommas(mittMultipleEventsMemory)} | ${formatSize(bundleSizes.mitt.size)} | ${formatSize(bundleSizes.mitt.gzippedSize)} |
| nanoevents   | ${formatMemoryWithStabilityAndCommas(nanoMemory, COUNT)} | ${formatMemoryWithStabilityAndCommas(nanoWithHandlersMemory)} | ${formatMemoryWithStabilityAndCommas(nanoMultipleEventsMemory)} | ${formatSize(bundleSizes.nanoevents.size)} | ${formatSize(bundleSizes.nanoevents.gzippedSize)} |
| RxJS         | ${formatMemoryWithStabilityAndCommas(rxjsMemory, COUNT)} | ${formatMemoryWithStabilityAndCommas(rxjsWithHandlersMemory)} | ${formatMemoryWithStabilityAndCommas(rxjsMultipleEventsMemory)} | ${formatSize(bundleSizes.rxjs.size)} | ${formatSize(bundleSizes.rxjs.gzippedSize)} |
`);
