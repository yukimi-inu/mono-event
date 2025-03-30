import EventEmitter3 from 'eventemitter3';
import mitt from 'mitt';
import { createNanoEvents } from 'nanoevents';
import { Subject } from 'rxjs';
import { mono } from '../../dist/index.min.js';
// Import necessary functions from utils.js
import {
  formatNumber,
  formatResult, // Keep for potential future use if needed
  formatMemory, // Used for KB conversion
  generateTable,
  findBestValue,
  createBestValueFormatter,
} from './utils.js';
import { EventEmitter as NodeEventEmitter, setMaxListeners } from 'node:events'; // Node.js specific import

setMaxListeners(0);

// --- Node.js Specific Imports and Setup ---
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;


// Function to measure memory usage (simplified, returns only average total)
function measureMemoryUsage(fn, runs = 5) {
  if (!isNode || !global.gc) {
      console.warn("GC not available or not in Node.js, skipping precise memory measurement.");
      return { total: 0, stdDev: 0 }; // Return zero/default if GC not available
  }

  const measurements = [];
  const stabilizeMemory = new Array(1000000).fill(0); // Keep stabilization

  for (let i = 0; i < runs; i++) {
    global.gc(); global.gc(); global.gc(); // Force GC
    const stabilizeStart = Date.now();
    while (Date.now() - stabilizeStart < 100); // Wait

    const startMemory = process.memoryUsage().heapUsed;
    const createdObjects = fn(); // Execute function
    // Keep reference briefly
    if (Array.isArray(createdObjects) && createdObjects.length > 0) {
        if (createdObjects[0] === null) console.log('Preventing optimization');
    }
    const endMemory = process.memoryUsage().heapUsed;
    const used = endMemory - startMemory;

    // Allow 0 as a valid measurement, exclude only negative values
    if (used >= 0) {
        measurements.push(used);
    }

    const waitStart = Date.now();
    while (Date.now() - waitStart < 200); // Wait between runs
    global.gc(); global.gc(); // Cleanup
  }

  stabilizeMemory.length = 0; // Clear stabilization array

  if (measurements.length === 0) return { total: 0, stdDev: 0 }; // Handle no valid measurements

  measurements.sort((a, b) => a - b);
  const validMeasurements = measurements.length >= 4 ? measurements.slice(1, -1) : measurements;
  const sum = validMeasurements.reduce((acc, val) => acc + val, 0);
  const average = sum / validMeasurements.length;
  const stdDev = calculateStdDev(validMeasurements, average);

  return { total: average, stdDev };
}

// Calculate standard deviation
function calculateStdDev(values, mean) {
  if (values.length <= 1) return 0;
  const variance = values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// --- Benchmark Scenarios ---

// Helper to run a memory scenario and store results
// Re-add the runMemoryScenario function definition
function runMemoryScenario(name, fn, count = 1) {
  console.log(`\n===== ${name} =====`);
  // Use template literal and formatNumber for count
  console.log(
    `Measuring memory for ${count > 1 ? `${formatNumber(count)} instances/operations` : '1 instance/operation'}...`,
  );
  const memoryResult = measureMemoryUsage(fn);
  // Calculate per instance memory ONLY if count > 1, otherwise use total
  const displayMemory = count > 1 ? memoryResult.total / count : memoryResult.total;

  // Log result without CV
  console.log(`Result: ${formatMemory(displayMemory)} KB ${count > 1 ? 'per instance' : ''}`);
  return {
    // Return an object compatible with benchmark.js structure
    perInstance: count > 1 ? displayMemory : null, // Only set perInstance if count > 1
    total: memoryResult.total, // Always store the total measured memory
    // cv: cv, // CV removed from return object as well
    raw: memoryResult, // Keep raw data if needed
  };
}


// Define Libraries
// Use full names consistent with benchmark.js
const libraries = {
  'mono-event': { create: () => mono() },
  'EventEmitter3': { create: () => new EventEmitter3() },
  'mitt': { create: () => mitt() },
  'nanoevents': { create: () => createNanoEvents() },
  'RxJS': { create: () => new Subject() },
  // Add Node.js specific libraries conditionally
  ...(isNode && NodeEventEmitter && { 'Node Events': { create: () => new NodeEventEmitter() } }),
  // EventTarget is globally available
  ...(typeof EventTarget !== 'undefined' && { 'EventTarget': { create: () => new EventTarget() } }),
};

const libsToRun = Object.keys(libraries); // Now contains full names

// --- Scenario Definitions ---
const scenarios = {
  '1_basic': {
    name: 'Scenario 1: Basic Memory Usage (per instance)',
    count: 50000,
    // run function now receives libKey (full name)
    run: (libKey, count) => {
      const libCreate = libraries[libKey]?.create;
      if (!libCreate) return { total: null };
      return runMemoryScenario(`Basic Usage - ${libKey}`, () => {
        const instances = [];
        for (let i = 0; i < count; i++) instances.push(libCreate());
        return instances;
      }, count);
    },
  },
  '2_with_handlers': {
    name: 'Scenario 2: Memory Usage with Handlers',
    handlerCount: 10000,
    // run function now receives libInfo with full name
    run: (libInfo, handlerCount) => {
      const dummyHandler = () => {};
      const libCreate = libInfo.create;
      const libName = libInfo.name; // Full name
      if (!libCreate) return { total: null };

      const addHandlerFn = (() => {
        if (libName === 'RxJS') return (instance, handler) => instance.subscribe(handler);
        if (libName === 'mono-event') return (instance, handler) => instance.add(handler);
        // Default for EventEmitter3, mitt, nanoevents, Node Events, EventTarget
        return (instance, handler) => {
            if (typeof instance.on === 'function') instance.on('event', handler);
            else if (typeof instance.addEventListener === 'function') instance.addEventListener('event', handler);
        };
      })();

      const result = measureMemoryUsage(() => {
        const instance = libCreate();
        for (let i = 0; i < handlerCount; i++) addHandlerFn(instance, dummyHandler);
        return instance;
      });
      return { total: result.total }; // Return total memory for the single instance
    },
  },
  '3_concentrated': {
    name: 'Scenario 3: Concentrated Events (Few Instances, Many Events)',
    eventCount: 1000,
    instanceCount: 100,
    run: (libInfo, eventCount, instanceCount) => {
      const dummyHandler = () => {};
      const libCreate = libInfo.create;
      const libName = libInfo.name; // Full name
      if (!libCreate) return { total: null };

      // Skip for libraries that don't support multiple named events easily
      if (libName === 'mono-event' || libName === 'EventTarget') {
        console.log(`  Skipping Concentrated Events for ${libName} (not applicable)`);
        return { total: null };
      }

      const addHandlerFn = (() => {
        if (libName === 'RxJS') return null; // Special handling below
        // Default for EventEmitter3, mitt, nanoevents, Node Events
        return (instance, eventName, handler) => instance.on(eventName, handler);
      })();

      let result;
      if (libName === 'RxJS') {
        result = measureMemoryUsage(() => {
          const instances = [];
          for (let i = 0; i < instanceCount; i++) {
            const subjects = {};
            for (let j = 0; j < eventCount; j++) {
              subjects[`event${j}`] = new Subject();
              subjects[`event${j}`].subscribe(dummyHandler);
            }
            instances.push(subjects);
          }
          return instances;
        });
      } else {
        result = measureMemoryUsage(() => {
          const instances = [];
          for (let i = 0; i < instanceCount; i++) {
            const emitter = libCreate();
            for (let j = 0; j < eventCount; j++) addHandlerFn(emitter, `event${j}`, dummyHandler);
            instances.push(emitter);
          }
          return instances;
        });
      }
      return { total: result.total };
    },
  },
  '4_distributed': {
    name: 'Scenario 4: Distributed Events (Many Instances, Single Event)',
    instanceCount: 1000000,
    run: (libInfo, instanceCount) => {
      const dummyHandler = () => {};
      const libCreate = libInfo.create;
      const libName = libInfo.name; // Full name
      if (!libCreate) return { total: null };

      const addHandlerFn = (() => {
        if (libName === 'RxJS') return (instance, handler) => instance.subscribe(handler);
        if (libName === 'mono-event') return (instance, handler) => instance.add(handler);
        // Default for EventEmitter3, mitt, nanoevents, Node Events, EventTarget
        return (instance, handler) => {
            if (typeof instance.on === 'function') instance.on('event', handler);
            else if (typeof instance.addEventListener === 'function') instance.addEventListener('event', handler);
        };
      })();

      const result = measureMemoryUsage(() => {
        const instances = [];
        for (let i = 0; i < instanceCount; i++) {
          const instance = libCreate();
          addHandlerFn(instance, dummyHandler);
          instances.push(instance);
        }
        return instances;
      });
      return { total: result.total };
    },
  },
};

// --- Main Execution ---
// Wrap main logic in an async function to use await for imports
async function main() {
    console.log('\n=== Event Libraries Memory Usage Benchmark ===\n');

    if (!isNode || typeof global === 'undefined' || !global.gc) {
      console.error('This benchmark requires Node.js with the --expose-gc flag enabled.');
      console.error('Please run with: node --expose-gc docs/performance/memory-benchmark.js');
      process.exit(1);
    }

    // Update libraries object after potential async import
    const currentLibraries = {
      'mono-event': { create: () => mono() },
      'EventEmitter3': { create: () => new EventEmitter3() },
      'mitt': { create: () => mitt() },
      'nanoevents': { create: () => createNanoEvents() },
      'RxJS': { create: () => new Subject() },
      ...(isNode && NodeEventEmitter && { 'Node Events': { create: () => new NodeEventEmitter() } }),
      ...(typeof EventTarget !== 'undefined' && { 'EventTarget': { create: () => new EventTarget() } }),
    };
    const currentLibsToRun = Object.keys(currentLibraries); // Contains full names


    const allResults = {};

    // Run scenarios and display individual tables
    for (const scenarioKey in scenarios) {
      const scenario = scenarios[scenarioKey];
      console.log(`\n----- ${scenario.name} -----`);
      allResults[scenarioKey] = {};
      const scenarioRows = [];
      // Use full library names in the table
      const scenarioHeaders = ['Library', 'Memory (KB)'];
      const scenarioPaddings = [14, 18]; // Adjust padding if needed for longer names
      const scenarioAlignments = ['left', 'right'];

      for (const libKey of currentLibsToRun) { // libKey is now full name
        if (!currentLibraries[libKey]) { // Check if library is available
            allResults[scenarioKey][libKey] = { total: null };
            scenarioRows.push([libKey, null]); // Add row with null result
            continue;
        }

        const libInfo = { create: currentLibraries[libKey].create, name: libKey }; // libKey is the full name
        let result;
        if (scenarioKey === '1_basic') result = scenario.run(libKey, scenario.count); // Pass full name
        else if (scenarioKey === '2_with_handlers') result = scenario.run(libInfo, scenario.handlerCount);
        else if (scenarioKey === '3_concentrated') result = scenario.run(libInfo, scenario.eventCount, scenario.instanceCount);
        else if (scenarioKey === '4_distributed') result = scenario.run(libInfo, scenario.instanceCount);

        allResults[scenarioKey][libKey] = result;

        // Prepare row for individual table
        let displayValue = null;
        if (result && typeof result.total === 'number') {
            if (scenarioKey === '1_basic') {
                displayValue = result.total / scenario.count; // Per instance
            } else {
                displayValue = result.total; // Total
            }
        }
        scenarioRows.push([libKey, displayValue]); // Use full name (libKey)
      }

       // Find best value for the individual table
       const bestIndividualValue = findBestValue(scenarioRows, 1, true); // Check second column (index 1)

       // Formatters for individual table
       const individualFormatters = [
           (v) => String(v),
           createBestValueFormatter(formatMemory, bestIndividualValue) // Use formatMemory, highlight best
       ];

       // Display individual table
       console.log(generateTable({
           headers: scenarioHeaders,
           rows: scenarioRows,
           formatters: individualFormatters,
           paddings: scenarioPaddings,
           alignments: scenarioAlignments,
       }));
    }

    // --- Summary Table ---
    console.log('\n===== Memory Usage Summary =====');

    const summaryHeaders = [
      'Library',
      'Per Instance (KB)', // Scenario 1
      `With ${formatNumber(scenarios['2_with_handlers'].handlerCount)} Handlers (KB)`, // Scenario 2
      `${formatNumber(scenarios['3_concentrated'].eventCount)} Events × ${formatNumber(scenarios['3_concentrated'].instanceCount)} Instances (KB)`, // Scenario 3
      `${formatNumber(scenarios['4_distributed'].instanceCount)} Instances (Total KB)`, // Scenario 4
    ];

    const summaryRows = [];
    // Adjust padding for potentially longer library names
    const summaryPaddings = [14, 18, 25, 35, 30];
    const summaryAlignments = ['left', 'right', 'right', 'right', 'right'];

    const getResult = (scenarioKey, libKey) => allResults[scenarioKey]?.[libKey] || { total: null };

    for (const libKey of currentLibsToRun) { // libKey is now full name
      const rowData = [
        libKey, // Use full name
        getResult('1_basic', libKey),
        getResult('2_with_handlers', libKey),
        getResult('3_concentrated', libKey),
        getResult('4_distributed', libKey),
      ];
      summaryRows.push(rowData);
    }

    // Find best values for each column (lower is better)
    const bestValues = summaryHeaders.slice(1).map((header, index) => {
      const colIndex = index + 1;
      // Accessor logic based on column index
      const accessor = (cell) => {
          if (!cell) return null;
          if (index === 0) return cell.total / scenarios['1_basic'].count; // Per instance for Scenario 1
          return cell.total; // Total for Scenarios 2, 3, 4
      };
      return findBestValue(summaryRows, colIndex, true, accessor);
    });

    // Create formatters for summary table (without CV)
    const summaryFormatters = [
        (v) => String(v), // Library name
        ...summaryHeaders.slice(1).map((header, index) => {
            const bestVal = bestValues[index];
            let baseFormatter;
            let valueAccessor;

            if (index === 0) { // Scenario 1: Per Instance
                baseFormatter = (cell) => {
                    if (cell && typeof cell.total === 'number') {
                        return formatMemory(cell.total / scenarios['1_basic'].count);
                    }
                    return '-';
                };
                valueAccessor = (cell) => cell ? cell.total / scenarios['1_basic'].count : null;
            } else { // Scenarios 2, 3, 4: Total
                baseFormatter = (cell) => {
                    if (cell && typeof cell.total === 'number') {
                        return formatMemory(cell.total);
                    }
                    return '-';
                };
                valueAccessor = (cell) => cell?.total;
            }
            return createBestValueFormatter(baseFormatter, bestVal, valueAccessor);
        }),
    ];


    console.log(
      generateTable({
        headers: summaryHeaders,
        rows: summaryRows,
        formatters: summaryFormatters,
        paddings: summaryPaddings,
        alignments: summaryAlignments,
      }),
    );
}

// Execute the main async function
main().catch(err => {
    console.error("Benchmark failed:", err);
    process.exit(1);
});
