// Memory usage benchmark for event libraries
import { mono, monoAsync } from '../../dist/index.min.js';
import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Utility function to format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Utility function to format memory size
function formatMemory(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
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
        gzippedSize: getGzippedSize(mainFile)
      };
    }
    
    // If main file not found, try common patterns
    const possiblePaths = [
      path.join(rootDir, 'node_modules', packageName, 'dist', `${packageName}.min.js`),
      path.join(rootDir, 'node_modules', packageName, 'dist', 'index.min.js'),
      path.join(rootDir, 'node_modules', packageName, 'umd', `${packageName}.min.js`),
      path.join(rootDir, 'node_modules', packageName, 'lib', 'index.js'),
      path.join(rootDir, 'node_modules', packageName, 'index.js')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return {
          path: possiblePath,
          size: getBundleSize(possiblePath),
          gzippedSize: getGzippedSize(possiblePath)
        };
      }
    }
    
    return { path: null, size: 0, gzippedSize: 0 };
  } catch (error) {
    console.error(`Error getting package size for ${packageName}:`, error.message);
    return { path: null, size: 0, gzippedSize: 0 };
  }
}

// Function to measure memory usage for a specific operation
function measureMemoryUsage(fn) {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const startMemory = process.memoryUsage().heapUsed;
  
  // Execute the function that creates objects
  const result = fn();
  
  const endMemory = process.memoryUsage().heapUsed;
  const used = endMemory - startMemory;
  
  return {
    total: used,
    result
  };
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
console.log(`mono-event: ${formatMemory(monoMemory.total / COUNT)}`);
console.log(`EventEmitter3: ${formatMemory(ee3Memory.total / COUNT)}`);
console.log(`mitt: ${formatMemory(mittMemory.total / COUNT)}`);
console.log(`nanoevents: ${formatMemory(nanoMemory.total / COUNT)}`);
console.log(`RxJS: ${formatMemory(rxjsMemory.total / COUNT)}`);

// ===== Scenario 2: Memory Usage with 500 Handlers =====
console.log('\n===== Scenario 2: Memory Usage with 500 Handlers =====');

const HANDLER_COUNT = 500; // Number of handlers to register (調整済み)

// Create a dummy handler function
const dummyHandler = () => {};

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

console.log(`Memory usage for 1 instance with ${HANDLER_COUNT} handlers:`);
console.log(`mono-event: ${formatMemory(monoWithHandlersMemory.total)}`);
console.log(`EventEmitter3: ${formatMemory(ee3WithHandlersMemory.total)}`);
console.log(`mitt: ${formatMemory(mittWithHandlersMemory.total)}`);
console.log(`nanoevents: ${formatMemory(nanoWithHandlersMemory.total)}`);
console.log(`RxJS: ${formatMemory(rxjsWithHandlersMemory.total)}`);

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

console.log(`Memory comparison for ${EVENT_COUNT} events × ${INSTANCE_COUNT} instances vs ${MONO_INSTANCE_COUNT} mono-event instances:`);
console.log(`EventEmitter3 (${EVENT_COUNT} events × ${INSTANCE_COUNT} instances): ${formatMemory(ee3MultipleEventsMemory.total)}`);
console.log(`mitt (${EVENT_COUNT} events × ${INSTANCE_COUNT} instances): ${formatMemory(mittMultipleEventsMemory.total)}`);
console.log(`nanoevents (${EVENT_COUNT} events × ${INSTANCE_COUNT} instances): ${formatMemory(nanoMultipleEventsMemory.total)}`);
console.log(`RxJS (${EVENT_COUNT} events × ${INSTANCE_COUNT} instances): ${formatMemory(rxjsMultipleEventsMemory.total)}`);
console.log(`mono-event (${MONO_INSTANCE_COUNT} instances): ${formatMemory(monoMultipleInstancesMemory.total)}`);

// ===== Bundle Size Benchmark =====
console.log('\n===== Bundle Size Benchmark =====');

// Define libraries to measure
const libraries = {
  'mono-event': { path: path.join(rootDir, 'dist', 'index.min.js') },
  'eventemitter3': { package: 'eventemitter3' },
  'mitt': { package: 'mitt' },
  'nanoevents': { package: 'nanoevents' },
  'rxjs': { package: 'rxjs' }
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
  
  bundleSizes[library] = { size, gzippedSize, filePath };
}

console.log('| Library      | Minified Size | Gzipped Size |');
console.log('|--------------|---------------|--------------|');

for (const [library, info] of Object.entries(bundleSizes)) {
  console.log(`| ${library.padEnd(12)} | ${formatSize(info.size).padEnd(13)} | ${formatSize(info.gzippedSize).padEnd(12)} |`);
}

// ===== Memory Usage Summary =====
console.log('\n===== Memory Usage Summary =====');

console.log(`
| Library      | Per Instance | With ${HANDLER_COUNT} Handlers | ${EVENT_COUNT} Events × ${INSTANCE_COUNT} Instances | Bundle Size | Gzipped Size |
|--------------|--------------|-----------------|--------------------------|-------------|--------------|
| mono-event   | ${formatMemory(monoMemory.total / COUNT)} | ${formatMemory(monoWithHandlersMemory.total)} | ${formatMemory(monoMultipleInstancesMemory.total)} (${MONO_INSTANCE_COUNT} instances) | ${formatSize(bundleSizes['mono-event'].size)} | ${formatSize(bundleSizes['mono-event'].gzippedSize)} |
| EventEmitter3| ${formatMemory(ee3Memory.total / COUNT)} | ${formatMemory(ee3WithHandlersMemory.total)} | ${formatMemory(ee3MultipleEventsMemory.total)} | ${formatSize(bundleSizes['eventemitter3'].size)} | ${formatSize(bundleSizes['eventemitter3'].gzippedSize)} |
| mitt         | ${formatMemory(mittMemory.total / COUNT)} | ${formatMemory(mittWithHandlersMemory.total)} | ${formatMemory(mittMultipleEventsMemory.total)} | ${formatSize(bundleSizes['mitt'].size)} | ${formatSize(bundleSizes['mitt'].gzippedSize)} |
| nanoevents   | ${formatMemory(nanoMemory.total / COUNT)} | ${formatMemory(nanoWithHandlersMemory.total)} | ${formatMemory(nanoMultipleEventsMemory.total)} | ${formatSize(bundleSizes['nanoevents'].size)} | ${formatSize(bundleSizes['nanoevents'].gzippedSize)} |
| RxJS         | ${formatMemory(rxjsMemory.total / COUNT)} | ${formatMemory(rxjsWithHandlersMemory.total)} | ${formatMemory(rxjsMultipleEventsMemory.total)} | ${formatSize(bundleSizes['rxjs'].size)} | ${formatSize(bundleSizes['rxjs'].gzippedSize)} |
`);