import { formatNumber, formatResult, formatMemory, generateBenchmarkTable, generateTable } from './utils.js';
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
import {setMaxListeners} from 'node:events';

// Disable max listeners warning for all instances
setMaxListeners(0);

// --- Argument Parsing ---
const args = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => !Number.isNaN(n) && n > 0);
const runOnly = new Set(args);
const runAll = runOnly.size === 0;

// --- Benchmark Configuration Constants ---
const ITERATIONS = 500000; // Default iterations for Emit etc.
const REGISTER_ITERATIONS = 50000; // Reduced iterations for Register Single
const LISTENER_COUNT = 500;
const REMOVAL_ITERATIONS = 10000;
const REGISTER_MULTI_INSTANCE_COUNT = 5000; // Reduced iterations for Register Multi
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

// --- Column Definitions for Tables ---
// Define padding here for consistency
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

// Define columns for each benchmark type
const timeColumns = (key = 'result') => [{ header: 'Result (ms)', key, pad: padComp, formatFn: formatResult }]; // Default for most time benchmarks
const memoryColumns = (key = 'memory') => [
  { header: 'Memory (KB/inst)', key, pad: padMemEmpty, formatFn: formatMemory },
]; // Default for memory

// --- Benchmark Runners Definition ---
// Runner now returns the raw result object, formatting happens later
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
    columns: [
      // Special columns for emission including restrict
      { header: 'mono (ms)', key: 'mono', pad: padEmit, formatFn: formatResult },
      { header: 'Restrict (ms)', key: 'restrict', pad: 13, formatFn: formatResult },
      { header: 'EE3 (ms)', key: 'ee3', pad: padEmit, formatFn: formatResult },
      { header: 'Mitt (ms)', key: 'mitt', pad: padEmit, formatFn: formatResult },
      { header: 'Nano (ms)', key: 'nano', pad: padEmit, formatFn: formatResult },
      { header: 'RxJS (ms)', key: 'rxjs', pad: padEmit, formatFn: formatResult },
      { header: 'Node (ms)', key: 'nodeEvents', pad: padEmit, formatFn: formatResult },
      { header: 'Target (ms)', key: 'eventTarget', pad: padEmit, formatFn: formatResult },
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
    columns: timeColumns(),
  },
};

// --- Library Definitions ---
const libs = ['mono-event', 'Restrict', 'EventEmitter3', 'mitt', 'nanoevents', 'RxJS', 'Node Events', 'EventTarget'];

// --- Helper Functions ---
function shouldRun(id) {
  return runAll || runOnly.has(id);
}

/**
 * Converts a library display name to its internal key used in results objects.
 * @param {string} libName The display name of the library.
 * @returns {string} The internal key for the library.
 */
function getLibKey(libName) {
  switch (libName) {
    case 'mono-event':
      return 'mono';
    case 'Restrict':
      return 'restrict';
    case 'EventEmitter3':
      return 'ee3';
    case 'nanoevents':
      return 'nano';
    case 'Node Events':
      return 'nodeEvents';
    case 'EventTarget':
      return 'eventTarget';
    default:
      return libName.toLowerCase(); // mitt, rxjs
  }
}

// --- Main Execution ---
if (!runAll) {
  console.log(
    `Running only specified benchmarks: ${args.map((id) => benchmarkRunners[id]?.name || `Unknown(${id})`).join(', ')}`,
  );
}

console.log('\n=== Event Libraries Performance Benchmark ===');
// Display config values used in this run
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

// --- Run Benchmarks ---
const allResults = {}; // Store all results for final summary
let memoryTestRun = false;

for (const id in benchmarkRunners) {
  if (shouldRun(Number(id))) {
    const { name, runner, columns } = benchmarkRunners[id];
    const title = `----- [${id}] ${name} -----`;
    console.log(title);
    const startTime = performance.now();
    const scenarioResult = runner();
    const endTime = performance.now();
    console.log(`Completed in ${(endTime - startTime).toFixed(3)} ms`);

    if (scenarioResult) {
      allResults[id] = scenarioResult; // Store for final summary

      // Define columns for the intermediate table based on benchmark type
      let intermediateColumns;
      let currentLibs = libs; // Default libs
      if (id === '9' || id === '10') {
        // Memory tests
        intermediateColumns = [{ header: 'Memory (KB/inst)', key: 'memory', pad: 16, formatFn: formatMemory }];
        memoryTestRun = true;
      } else if (id === '11') {
        // Comprehensive test
        // Phase timings are logged within the scenario runner itself now
        console.log(`  Total Avg Time -> mono-event: ${formatResult(scenarioResult.mono)} ms`);
        console.log(`  Total Avg Time -> EventEmitter3: ${formatResult(scenarioResult.ee3)} ms`);
        console.log(`  Total Avg Time -> mitt: ${formatResult(scenarioResult.mitt)} ms`);
        console.log(`  Total Avg Time -> nanoevents: ${formatResult(scenarioResult.nano)} ms`);
        console.log(`  Total Avg Time -> RxJS: ${formatResult(scenarioResult.rxjs)} ms`);
        console.log(`  Total Avg Time -> Node Events: ${formatResult(scenarioResult.nodeEvents)} ms`);
        console.log(`  Total Avg Time -> EventTarget: ${formatResult(scenarioResult.eventTarget)} ms`);
        intermediateColumns = null; // Skip intermediate table generation
      } else if (id === '7') {
        // Emission test with Restrict
        // Use the specific columns defined in benchmarkRunners for emission
        intermediateColumns = columns;
        // Keep 'Restrict' in libs for this specific table
      } else {
        // Other performance tests
        intermediateColumns = [{ header: 'Result (ms)', key: 'result', pad: 11, formatFn: formatResult }];
        currentLibs = libs.filter((l) => l !== 'Restrict'); // Exclude 'Restrict'
      }

      // Generate and print intermediate table if columns are defined
      if (intermediateColumns) {
        if (id === '7') {
          // Emissionテーブル用の処理（他のテーブルと同じ形式に）
          const headers = ['Library', 'Result (ms)'];
          const rows = [];
          const emissionLibs = [
            'mono-event',
            'Restrict',
            'EventEmitter3',
            'mitt',
            'nanoevents',
            'RxJS',
            'Node Events',
            'EventTarget',
          ];

          for (const libName of emissionLibs) {
            const libKey = getLibKey(libName);
            if (scenarioResult[libKey] !== undefined) {
              rows.push([libName, scenarioResult[libKey]]);
            }
          }

          // テーブルを生成して表示
          console.log(
            generateTable({
              headers,
              rows,
              formatters: [(v) => String(v), (v) => formatResult(v, 0, 3)],
              paddings: [16, 11],
              alignRight: true,
            }),
          );
        } else {
          // 他のテーブルは通常通り処理
          console.log(generateBenchmarkTable('', currentLibs, scenarioResult, intermediateColumns));
        }
      }
    } else if (id === '9' || id === '10') {
      console.log('  Memory test skipped (GC not exposed).');
    }
    console.log('');
  }
}

// ===== Summary =====
console.log('\n----- Performance Summary (lower is better) -----');

// Define columns for the summary table
const summaryColumns = [
  { header: 'Init (ms)', key: '1', pad: padInit, formatFn: formatResult },
  { header: 'Register (Single) (ms)', key: '2', pad: padRegSingle, formatFn: formatResult },
  { header: 'Register (Multi) (ms)', key: '3', pad: padRegMulti, formatFn: formatResult },
  { header: 'Removal (Fwd) (ms)', key: '4', pad: padRemFwd, formatFn: formatResult },
  { header: 'Removal (Bwd) (ms)', key: '5', pad: padRemBwd, formatFn: formatResult },
  { header: 'Removal (Rnd) (ms)', key: '6', pad: padRemRnd, formatFn: formatResult },
  { header: 'Emit (ms)', key: '7', pad: padEmit, formatFn: formatResult },
  { header: 'Emit Once (ms)', key: '8', pad: padEmitOnce, formatFn: formatResult },
  { header: 'Memory (Empty) (KB/inst)', key: '9', pad: padMemEmpty, formatFn: formatMemory },
  {
    header: `Memory (${MEMORY_LISTENERS} Listeners) (KB/inst)`,
    key: '10',
    pad: padMemListeners,
    formatFn: formatMemory,
  },
  { header: 'Comprehensive (ms)', key: '11', pad: padComp, formatFn: formatResult },
];

// サマリーテーブル用のデータを準備
const headers = ['Library', ...summaryColumns.map((c) => c.header)];
const rows = [];

// すべてのライブラリの行を作成（Restrictも含む）
for (const lib of libs) {
  const libKey = getLibKey(lib);
  const row = [lib];
  for (const column of summaryColumns) {
    const benchId = column.key;
    const result = allResults[benchId];

    // 特別処理
    if (lib === 'Restrict') {
      // Restrictライブラリは特別処理（Emitのみ結果がある）
      if (column.key === '7' && allResults[7]?.restrict !== undefined) {
        row.push(allResults[7].restrict);
      } else {
        row.push(null); // N/Aとして表示
      }
    } else if (column.key === '11' && allResults[11]) {
      // Comprehensive Scenarioの結果は直接取得
      row.push(allResults[11][libKey]);
    } else {
      // 通常の結果取得
      row.push(result ? result[libKey] : null);
    }
  }
  rows.push(row);
}

// テーブルを生成して表示
console.log(
  generateTable({
    headers,
    rows,
    formatters: [(v) => String(v), ...summaryColumns.map((c) => c.formatFn || ((v) => String(v)))],
    paddings: [16, ...summaryColumns.map((c) => c.pad || 10)],
    alignRight: true,
  }),
);

// Comprehensive Scenarioの結果をテーブル形式で表示
if (shouldRun(11) && allResults[11]) {
  console.log('\n----- [11] Comprehensive Scenario -----');

  // フェーズタイミングテーブルを表示
  if (allResults[11].phaseResults && allResults[11].libDisplayOrder && allResults[11].phaseColumns) {
    console.log('\n--- Comprehensive Scenario Phase Timings (avg ms) ---');

    // フェーズタイミングデータを準備
    const phaseRows = [];
    for (const libName of allResults[11].libDisplayOrder) {
      const libKey = getLibKey(libName);

      if (allResults[11].phaseResults[libKey]) {
        const row = [libName];
        for (const column of allResults[11].phaseColumns) {
          row.push(allResults[11].phaseResults[libKey][column.key]);
        }
        phaseRows.push(row);
      }
    }

    // フェーズタイミングテーブルを生成して表示
    console.log(
      generateTable({
        headers: ['Library', ...allResults[11].phaseColumns.map((c) => c.header)],
        rows: phaseRows,
        formatters: [(v) => String(v), ...allResults[11].phaseColumns.map((c) => c.formatFn || ((v) => String(v)))],
        paddings: [16, ...allResults[11].phaseColumns.map((c) => c.pad || 10)],
        alignRight: true,
      }),
    );
  }

  // 総合時間テーブルを表示
  console.log('\n----- [11] Comprehensive Scenario Results (Total Avg Time - lower is better) -----');

  // テーブルデータを準備
  const compHeaders = ['Library', 'Total Time (ms)'];
  const compRows = [];
  const compLibs = ['mono-event', 'EventEmitter3', 'mitt', 'nanoevents', 'RxJS', 'Node Events', 'EventTarget'];

  // 各ライブラリの結果を行として追加
  for (const libName of compLibs) {
    const libKey = getLibKey(libName);
    if (allResults[11][libKey] !== undefined) {
      compRows.push([libName, allResults[11][libKey]]);
    }
  }

  // テーブルを生成して表示
  console.log(
    generateTable({
      headers: compHeaders,
      rows: compRows,
      formatters: [(v) => String(v), (v) => `${formatResult(v, 0, 3)} ms`],
      paddings: [16, 12],
      alignRight: true,
    }),
  );
}
