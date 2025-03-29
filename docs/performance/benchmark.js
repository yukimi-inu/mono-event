import { formatNumber, formatResult, formatMemory, generateTable } from './utils.js'; // Removed generateBenchmarkTable
import { runInitializationBenchmark } from './scenarios/initialization.js';
import { runRegisterSingleBenchmark } from './scenarios/registerSingle.js';
import { runRegisterMultiBenchmark } from './scenarios/registerMulti.js';
import { runRemovalFwdBenchmark } from './scenarios/removalFwd.js';
import { runRemovalBwdBenchmark } from './scenarios/removalBwd.js';
import { runRemovalRndBenchmark } from './scenarios/removalRnd.js';
import { runEmissionBenchmark } from './scenarios/emission.js';
import { runEmissionOnceBenchmark } from './scenarios/emissionOnce.js';
import { runMemoryEmptyBenchmark } from './scenarios/memoryEmpty.js';
import { runMemoryListenersBenchmark } from './scenarios/memoryListeners.js';
import { runComprehensiveBenchmark } from './scenarios/comprehensive.js';
import { setMaxListeners } from 'node:events';

// Disable max listeners warning for all instances
setMaxListeners(0);

const args = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => !Number.isNaN(n) && n > 0);
const runOnly = new Set(args);
const runAll = runOnly.size === 0;

// Benchmark Configuration Constants
const ITERATIONS = 500000;
const REGISTER_ITERATIONS = 50000;
const LISTENER_COUNT = 500;
const REMOVAL_ITERATIONS = 10000;
const REGISTER_MULTI_INSTANCE_COUNT = 5000;
const LISTENERS_PER_MULTI_INSTANCE = 10;
const MEMORY_INSTANCE_COUNT = 10000;
const MEMORY_LISTENERS = 100;
const MEMORY_INSTANCE_COUNT_WITH_LISTENERS = 1000;
const ONCE_LISTENER_COUNT = 10000;
const COMP_INSTANCE_COUNT = 500;
const COMP_INITIAL_LISTENERS = 10;
const COMP_ADD_LISTENERS = 50;
const COMP_REMOVE_LISTENERS = 25;
const COMP_FINAL_ADD_LISTENERS = 50;
const COMP_EMIT_COUNT = 2500;

// Column Paddings
const padInit = 9;
const padRegSingle = 18;
const padRegMulti = 17;
const padRemFwd = 17;
const padRemBwd = 17;
const padRemRnd = 17;
const padEmit = 9;
const padEmitOnce = 14;
const padMemEmpty = 16;
const padMemListeners = 19;
const padComp = 11;

// Column Definitions
const timeColumns = (key = 'result') => [{ header: 'Result (ms)', key, pad: padComp, formatFn: formatResult, align: 'right' }]; // Added align
const memoryColumns = (key = 'memory') => [
  { header: 'Memory (KB/inst)', key, pad: padMemEmpty, formatFn: formatMemory, align: 'right' }, // Added align
];

// Benchmark Runners
const benchmarkRunners = {
  1: { name: 'Initialization', runner: () => runInitializationBenchmark({ ITERATIONS }), columns: timeColumns() },
  2: {
    name: 'Register (Single Instance)',
    runner: () => runRegisterSingleBenchmark({ REGISTER_ITERATIONS }),
    columns: timeColumns(),
  },
  3: {
    name: 'Register (Multi-Instance)',
    runner: () => runRegisterMultiBenchmark({ REGISTER_MULTI_INSTANCE_COUNT, LISTENERS_PER_MULTI_INSTANCE }),
    columns: timeColumns(),
  },
  4: {
    name: 'Removal (Forward)',
    runner: () => runRemovalFwdBenchmark({ REMOVAL_ITERATIONS }),
    columns: timeColumns(),
  },
  5: {
    name: 'Removal (Backward)',
    runner: () => runRemovalBwdBenchmark({ REMOVAL_ITERATIONS }),
    columns: timeColumns(),
  },
  6: { name: 'Removal (Random)', runner: () => runRemovalRndBenchmark({ REMOVAL_ITERATIONS }), columns: timeColumns() },
  7: {
    name: 'Emission',
    runner: () => runEmissionBenchmark({ LISTENER_COUNT, ITERATIONS: 50000 }),
    columns: [ // Handled specially later
      { header: 'mono (ms)', key: 'mono', pad: padEmit, formatFn: formatResult, align: 'right' },
      { header: 'Restrict (ms)', key: 'restrict', pad: 13, formatFn: formatResult, align: 'right' },
      { header: 'EE3 (ms)', key: 'ee3', pad: padEmit, formatFn: formatResult, align: 'right' },
      { header: 'Mitt (ms)', key: 'mitt', pad: padEmit, formatFn: formatResult, align: 'right' },
      { header: 'Nano (ms)', key: 'nano', pad: padEmit, formatFn: formatResult, align: 'right' },
      { header: 'RxJS (ms)', key: 'rxjs', pad: padEmit, formatFn: formatResult, align: 'right' },
      { header: 'Node (ms)', key: 'nodeEvents', pad: padEmit, formatFn: formatResult, align: 'right' },
      { header: 'Target (ms)', key: 'eventTarget', pad: padEmit, formatFn: formatResult, align: 'right' },
    ],
  },
  8: {
    name: 'Emission (Once)',
    runner: () => runEmissionOnceBenchmark({ ONCE_LISTENER_COUNT }),
    columns: timeColumns(),
  },
  9: {
    name: 'Memory (Empty)',
    runner: () => runMemoryEmptyBenchmark({ MEMORY_INSTANCE_COUNT }),
    columns: memoryColumns(),
  },
  10: {
    name: 'Memory (With Listeners)',
    runner: () => runMemoryListenersBenchmark({ MEMORY_LISTENERS, MEMORY_INSTANCE_COUNT_WITH_LISTENERS }),
    columns: memoryColumns(),
  },
  11: {
    name: 'Comprehensive Scenario',
    runner: () =>
      runComprehensiveBenchmark({
        COMP_INSTANCE_COUNT,
        COMP_INITIAL_LISTENERS,
        COMP_ADD_LISTENERS,
        COMP_REMOVE_LISTENERS,
        COMP_FINAL_ADD_LISTENERS,
        COMP_EMIT_COUNT,
      }),
    columns: timeColumns(), // Handled specially later
  },
};

// Library Definitions
const libs = ['mono-event', 'Restrict', 'EventEmitter3', 'mitt', 'nanoevents', 'RxJS', 'Node Events', 'EventTarget'];

// Helper Functions
function shouldRun(id) {
  return runAll || runOnly.has(id);
}

function getLibKey(libName) {
  switch (libName) {
    case 'mono-event': return 'mono';
    case 'Restrict': return 'restrict';
    case 'EventEmitter3': return 'ee3';
    case 'nanoevents': return 'nano';
    case 'Node Events': return 'nodeEvents';
    case 'EventTarget': return 'eventTarget';
    default: return libName.toLowerCase(); // mitt, rxjs
  }
}

function findBestValue(rows, colIndex, lowerIsBetter = true) {
    let bestVal = null;
    for (const row of rows) {
        const value = row[colIndex];
        const numericValue = (typeof value === 'object' && value !== null && value.perInstance !== undefined)
                             ? value.perInstance // Handle memory object
                             : value;

        if (typeof numericValue === 'number' && !Number.isNaN(numericValue)) {
            if (bestVal === null || (lowerIsBetter && numericValue < bestVal) || (!lowerIsBetter && numericValue > bestVal)) {
                bestVal = numericValue;
            }
        }
    }
    return bestVal;
}

function createBestValueFormatter(baseFormatter, bestValue) { // Removed colIndex as it's not needed here
    return (cell) => {
        const formatted = baseFormatter(cell);
        if (bestValue === null || formatted === '-') return formatted;

        let originalValue = cell;
        // Handle memory object structure for comparison
        if (typeof cell === 'object' && cell !== null && cell.perInstance !== undefined) {
            originalValue = cell.perInstance;
        }

        if (typeof originalValue === 'number' && !Number.isNaN(originalValue) && originalValue === bestValue) {
            return `**${formatted}**`;
        }
        return formatted;
    };
}

// Main Execution
if (!runAll) {
  console.log(
    `Running only specified benchmarks: ${args.map((id) => benchmarkRunners[id]?.name || `Unknown(${id})`).join(', ')}`,
  );
}

console.log('\n=== Event Libraries Performance Benchmark ===');
console.log(`Iterations (Emit): ${formatNumber(ITERATIONS)}`);
console.log(`Iterations (Register Single): ${formatNumber(REGISTER_ITERATIONS)}`);
console.log(`Listeners per event (Emit): ${LISTENER_COUNT}`);
console.log(`Removal Iterations: ${formatNumber(REMOVAL_ITERATIONS)}`);
console.log(`Multi-Instance Count (Register): ${formatNumber(REGISTER_MULTI_INSTANCE_COUNT)}`);
console.log(`Listeners per Multi-Instance (Register): ${LISTENERS_PER_MULTI_INSTANCE}`);
console.log(`Memory Instance Count: ${formatNumber(MEMORY_INSTANCE_COUNT)}`);
console.log(`Memory Listeners per Instance: ${MEMORY_LISTENERS}`);
console.log(`Comprehensive Scenario Instances: ${COMP_INSTANCE_COUNT}`);
console.log(`Comprehensive Scenario Emit Count: ${COMP_EMIT_COUNT}`);
console.log('\n');

const allResults = {};
let memoryTestRun = false;

for (const id in benchmarkRunners) {
  if (shouldRun(Number(id))) {
    const { name, runner, columns: benchmarkColumns } = benchmarkRunners[id]; // Renamed columns to avoid conflict
    const title = `----- [${id}] ${name} -----`;
    console.log(title);
    const startTime = performance.now();
    const scenarioResult = runner();
    const endTime = performance.now();
    console.log(`Completed in ${formatResult(endTime - startTime)} ms`);

    if (scenarioResult) {
      allResults[id] = scenarioResult;

      const intermediateColumnsDefinition = benchmarkColumns; // Use const, as it's assigned only once here
      let currentLibs = libs;
      let generateIntermediateTable = true;

      if (id === '9' || id === '10') {
        // Memory tests use the defined memoryColumns
        memoryTestRun = true;
      } else if (id === '11') {
        // Comprehensive logs results directly
        console.log(`  Total Avg Time -> mono-event: ${formatResult(scenarioResult.mono)} ms`);
        console.log(`  Total Avg Time -> EventEmitter3: ${formatResult(scenarioResult.ee3)} ms`);
        console.log(`  Total Avg Time -> mitt: ${formatResult(scenarioResult.mitt)} ms`);
        console.log(`  Total Avg Time -> nanoevents: ${formatResult(scenarioResult.nano)} ms`);
        console.log(`  Total Avg Time -> RxJS: ${formatResult(scenarioResult.rxjs)} ms`);
        console.log(`  Total Avg Time -> Node Events: ${formatResult(scenarioResult.nodeEvents)} ms`);
        console.log(`  Total Avg Time -> EventTarget: ${formatResult(scenarioResult.eventTarget)} ms`);
        generateIntermediateTable = false;
      } else if (id === '7') {
        // Emission handled specially below
        generateIntermediateTable = false;
      } else {
        // Other performance tests use the defined timeColumns
        currentLibs = libs.filter((l) => l !== 'Restrict');
      }

      // Generate intermediate table using generateTable directly
      if (generateIntermediateTable && intermediateColumnsDefinition) {
          const headers = ['Library', ...intermediateColumnsDefinition.map(c => c.header)];
          const rows = [];
          for (const libName of currentLibs) {
              const libKey = getLibKey(libName);
              const row = [libName];
              for (const colDef of intermediateColumnsDefinition) {
                  let value = null;
                  if (scenarioResult[libKey]) {
                      // Get the raw result object/value for the library
                      const libResult = scenarioResult[libKey];
                      if (libResult !== undefined) {
                          if (colDef.key === 'memory') {
                              // Pass the object or null to the formatter
                              value = libResult;
                          } else {
                              // Assume time result is the direct value or nested under 'result'
                              value = (typeof libResult === 'object' && libResult !== null && libResult.result !== undefined)
                                      ? libResult.result
                                      : libResult;
                          }
                      }
                  }
                  row.push(value !== undefined ? value : null);
              }
              rows.push(row);
          }

          const bestValues = intermediateColumnsDefinition.map((col, index) => {
              return findBestValue(rows, index + 1); // +1 for Library column
          });

          const formatters = [
              (v) => String(v), // Library name
              ...intermediateColumnsDefinition.map((col, index) => {
                  const bestVal = bestValues[index];
                  return createBestValueFormatter(col.formatFn, bestVal);
              })
          ];

          const paddings = [16, ...intermediateColumnsDefinition.map(c => c.pad || 10)];
          const alignments = ['left', ...intermediateColumnsDefinition.map(c => c.align || 'right')];

          console.log(generateTable({ headers, rows, formatters, paddings, alignments }));

      } else if (id === '7') {
          // Special handling for Emission table (id 7)
          const headers = ['Library', 'Result (ms)'];
          const rows = [];
          const emissionLibs = [
            'mono-event', 'Restrict', 'EventEmitter3', 'mitt',
            'nanoevents', 'RxJS', 'Node Events', 'EventTarget',
          ];

          for (const libName of emissionLibs) {
            const libKey = getLibKey(libName);
            rows.push([libName, scenarioResult[libKey] !== undefined ? scenarioResult[libKey] : null]);
          }

          const bestEmitValue = findBestValue(rows, 1);
          const formatters = [
              (v) => String(v),
              createBestValueFormatter(formatResult, bestEmitValue)
          ];

          console.log(
            generateTable({
              headers,
              rows,
              formatters,
              paddings: [16, 11],
              alignments: ['left', 'right'],
            }),
          );
      }
    } else if (id === '9' || id === '10') {
      console.log('  Memory test skipped (GC not exposed).');
    }
    console.log('');
  }
}

// Summary Table
console.log('\n----- Performance Summary (lower is better) -----');

const summaryColumns = [
  { header: 'Init (ms)', key: '1', pad: padInit, formatFn: formatResult, align: 'right' },
  { header: 'Register (Single) (ms)', key: '2', pad: padRegSingle, formatFn: formatResult, align: 'right' },
  { header: 'Register (Multi) (ms)', key: '3', pad: padRegMulti, formatFn: formatResult, align: 'right' },
  { header: 'Removal (Fwd) (ms)', key: '4', pad: padRemFwd, formatFn: formatResult, align: 'right' },
  { header: 'Removal (Bwd) (ms)', key: '5', pad: padRemBwd, formatFn: formatResult, align: 'right' },
  { header: 'Removal (Rnd) (ms)', key: '6', pad: padRemRnd, formatFn: formatResult, align: 'right' },
  { header: 'Emit (ms)', key: '7', pad: padEmit, formatFn: formatResult, align: 'right' },
  { header: 'Emit Once (ms)', key: '8', pad: padEmitOnce, formatFn: formatResult, align: 'right' },
  { header: 'Memory (Empty) (KB/inst)', key: '9', pad: padMemEmpty, formatFn: formatMemory, align: 'right' },
  {
    header: `Memory (${MEMORY_LISTENERS} Listeners) (KB/inst)`,
    key: '10',
    pad: padMemListeners,
    formatFn: formatMemory,
    align: 'right',
  },
  { header: 'Comprehensive (ms)', key: '11', pad: padComp, formatFn: formatResult, align: 'right' },
];

const summaryHeaders = ['Library', ...summaryColumns.map((c) => c.header)];
const summaryRows = [];

for (const lib of libs) {
  const libKey = getLibKey(lib);
  const row = [lib];
  for (const column of summaryColumns) {
    const benchId = column.key;
    const result = allResults[benchId];
    let value = null;

    if (lib === 'Restrict') {
      if (benchId === '7' && result?.restrict !== undefined) {
        value = result.restrict;
      }
    } else if (benchId === '11' && allResults[11]) {
      value = allResults[11][libKey];
    } else if (benchId === '7' && result) {
        value = result[libKey];
    } else if (result) {
      // Get the raw result object/value for the library
      const libResult = result[libKey];
      if (libResult !== undefined) {
          if (column.formatFn === formatMemory) {
              // Pass the object or null to the formatter
              value = libResult;
          } else {
              // Assume time result is the direct value or nested under 'result'
              value = (typeof libResult === 'object' && libResult !== null && libResult.result !== undefined)
                      ? libResult.result
                      : libResult;
          }
      }
    }
    row.push(value !== undefined ? value : null);
  }
  summaryRows.push(row);
}


const summaryBestValues = summaryColumns.map((col, index) => {
    const colIndex = index + 1;
    return findBestValue(summaryRows, colIndex, true);
});

const summaryFormatters = [
    (v) => String(v),
    ...summaryColumns.map((col, index) => {
        const bestVal = summaryBestValues[index];
        return createBestValueFormatter(col.formatFn, bestVal);
    })
];

console.log(
  generateTable({
    headers: summaryHeaders,
    rows: summaryRows,
    formatters: summaryFormatters,
    paddings: [16, ...summaryColumns.map((c) => c.pad || 10)],
    alignments: ['left', ...summaryColumns.map(c => c.align || 'right')],
  }),
);

// Comprehensive Scenario Tables
if (shouldRun(11) && allResults[11]) {
  console.log('\n----- [11] Comprehensive Scenario -----');

  // Phase Timings Table
  if (allResults[11].phaseResults && allResults[11].libDisplayOrder && allResults[11].phaseColumns) {
    console.log('\n--- Comprehensive Scenario Phase Timings (avg ms) ---');

    const phaseColumns = allResults[11].phaseColumns;
    const phaseHeaders = ['Library', ...phaseColumns.map((c) => c.header)];
    const phaseRows = [];

    for (const libName of allResults[11].libDisplayOrder) {
      const libKey = getLibKey(libName);
      if (allResults[11].phaseResults[libKey]) {
        const row = [libName];
        for (const column of phaseColumns) {
          const value = allResults[11].phaseResults[libKey][column.key];
          row.push(value !== undefined ? value : null);
        }
        phaseRows.push(row);
      }
    }

    const phaseBestValues = phaseColumns.map((col, index) => {
        return findBestValue(phaseRows, index + 1);
    });

    const phaseFormatters = [
        (v) => String(v),
        ...phaseColumns.map((col, index) => {
            const bestVal = phaseBestValues[index];
            const formatter = col.formatFn || formatResult;
            return createBestValueFormatter(formatter, bestVal);
        })
    ];

    console.log(
      generateTable({
        headers: phaseHeaders,
        rows: phaseRows,
        formatters: phaseFormatters,
        paddings: [16, ...phaseColumns.map((c) => c.pad || 10)],
        alignments: ['left', ...phaseColumns.map(c => c.align || 'right')],
      }),
    );
  }

  // Total Time Table
  console.log('\n----- [11] Comprehensive Scenario Results (Total Avg Time - lower is better) -----');

  const compHeaders = ['Library', 'Total Time (ms)'];
  const compRows = [];
  const compLibs = ['mono-event', 'EventEmitter3', 'mitt', 'nanoevents', 'RxJS', 'Node Events', 'EventTarget'];

  for (const libName of compLibs) {
    const libKey = getLibKey(libName);
    if (allResults[11][libKey] !== undefined) {
      compRows.push([libName, allResults[11][libKey]]);
    } else {
      compRows.push([libName, null]);
    }
  }

  const bestCompValue = findBestValue(compRows, 1);
  const compFormatters = [
      (v) => String(v),
      createBestValueFormatter(formatResult, bestCompValue)
  ];

  console.log(
    generateTable({
      headers: compHeaders,
      rows: compRows,
      formatters: compFormatters,
      paddings: [16, 18],
      alignments: ['left', 'right'],
    }),
  );
}
