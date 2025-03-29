// docs/performance/utils.js

/**
 * Measures the execution time of a function.
 * @param {function} fn The function to measure.
 * @returns {number} Execution time in milliseconds.
 */
export function measureTime(fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

/**
 * Runs a measurement multiple times and returns the average.
 * @param {function} fn The function to measure.
 * @param {number} [runs=3] Number of times to run the measurement.
 * @returns {number} Average execution time in milliseconds.
 */
export function measureTimeAverage(fn, runs = 3) {
  let total = 0;
  for (let i = 0; i < runs; i++) {
    total += measureTime(fn);
  }
  return total / runs;
}

/**
 * Formats a number with commas as thousands separators.
 * Returns 'N/A' if the input is not a valid number.
 * @param {number | any} num The number to format.
 * @returns {string} Formatted number string or 'N/A'.
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || Number.isNaN(num)) return 'N/A';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Shuffles an array in place using the Fisher-Yates (aka Knuth) algorithm.
 * @param {Array<any>} array The array to shuffle.
 * @returns {Array<any>} The shuffled array.
 */
export function shuffleArray(array) {
  let currentIndex = array.length;
  let randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

/**
 * Formats a benchmark result value (time in ms) for display.
 * Returns 'N/A' if the value is not a valid number.
 * @param {number | any} value The result value.
 * @param {number} [pad=0] Minimum width for padding.
 * @param {number} [precision=3] Number of decimal places.
 * @returns {string} Formatted result string or 'N/A'.
 */
export function formatResult(value, pad = 0, precision = 3) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
        return value.toFixed(precision).padStart(pad);
    }
    return 'N/A'.padStart(pad);
}

/**
 * Formats a memory benchmark result (per instance) for display.
 * Converts bytes to KB and formats the number.
 * Returns 'N/A' if the input is invalid.
 * @param {object | null} memResult Memory result object containing perInstance property in bytes.
 * @param {number} [pad=0] Minimum width for padding.
 * @returns {string} Formatted memory string in KB or 'N/A'.
 */
export function formatMemory(memResult, pad = 0) {
    if (memResult && typeof memResult.perInstance === 'number' && !Number.isNaN(memResult.perInstance)) {
        return (memResult.perInstance / 1024).toFixed(2).padStart(pad);
    }
    return 'N/A'.padStart(pad);
}

/**
 * Forces garbage collection if available in the environment (Node or Bun).
 */
export function forceGC() {
    if (typeof global !== 'undefined' && global.gc) {
        global.gc();
    } else if (typeof Bun !== 'undefined' && Bun.gc) {
        Bun.gc(true); // Force GC in Bun
    }
}

/**
 * 汎用的なテーブル生成関数
 * @param {object} options テーブル生成オプション
 * @param {string[]} options.headers テーブルのヘッダー行
 * @param {Array<Array<any>>} options.rows テーブルの行データ（2次元配列）
 * @param {Array<function>} [options.formatters] 各列のフォーマッター関数（省略可）
 * @param {Array<number>} [options.paddings] 各列のパディング（省略可）
 * @param {boolean} [options.alignRight=false] 数値を右揃えにするかどうか
 * @returns {string} フォーマットされたテーブル文字列
 */
export function generateTable(options) {
  const { headers, rows, formatters = [], paddings = [], alignRight = false } = options;
  
  if (!headers || !rows) {
    return '  No data available.\n';
  }
  
  // 各列の最大幅を計算（パディングが指定されていない場合）
  const columnWidths = headers.map((header, colIndex) => {
    // パディングが指定されている場合はそれを使用
    if (paddings[colIndex]) {
      return paddings[colIndex];
    }
    
    // そうでなければ最大幅を計算
    let maxWidth = header.length;
    for (const row of rows) {
      if (row[colIndex] === undefined || row[colIndex] === null) continue;
      const cellValue = String(row[colIndex]);
      maxWidth = Math.max(maxWidth, cellValue.length);
    }
    return maxWidth;
  });
  
  // ヘッダー行を生成
  const headerRow = `  | ${headers.map((header, i) => {
    return alignRight ? header.padStart(columnWidths[i]) : header.padEnd(columnWidths[i]);
  }).join(' | ')} |`;
  
  // 区切り行を生成
  const separator = `  |${columnWidths.map(width => '-'.repeat(width + 2)).join('|')}|`;
  
  // データ行を生成
  const dataRows = rows.map(row => {
    return `  | ${row.map((cell, i) => {
      // セルが未定義または null の場合は N/A を表示
      if (cell === undefined || cell === null) {
        return 'N/A'.padEnd(columnWidths[i]);
      }
      
      // フォーマッターが指定されている場合はそれを使用
      const formatter = formatters[i] || (v => String(v));
      const formattedValue = formatter(cell);
      
      // 数値は右揃え、それ以外は左揃え（alignRightが指定されている場合）
      if (alignRight && typeof cell === 'number') {
        return formattedValue.padStart(columnWidths[i]);
      }

      return formattedValue.padEnd(columnWidths[i]);
    }).join(' | ')} |`;
  });
  
  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * ベンチマーク結果用のテーブルを生成する
 * @param {string} title テーブルのタイトル
 * @param {string[]} libraries ライブラリ名の配列
 * @param {object} results 結果オブジェクト
 * @param {Array<object>} columns カラム定義
 * @returns {string} フォーマットされたテーブル文字列
 */
export function generateBenchmarkTable(title, libraries, results, columns) {
  // ヘッダーを生成
  const headers = ['Library', ...columns.map(c => c.header)];
  
  // フォーマッターを生成
  const formatters = [
    // 最初の列（ライブラリ名）のフォーマッター
    (v) => String(v),
    // 残りの列のフォーマッター
    ...columns.map(c => c.formatFn || ((v) => String(v)))
  ];
  
  // パディングを生成
  const paddings = [16, ...columns.map(c => c.pad || 10)];
  
  // 行データを生成
  const rows = libraries.map(lib => {
    let libKey;
    if (lib === 'mono-event') { libKey = 'mono'; }
    else if (lib === 'Restrict') { libKey = 'restrict'; }
    else if (lib === 'EventEmitter3') { libKey = 'ee3'; }
    else if (lib === 'nanoevents') { libKey = 'nano'; }
    else if (lib === 'Node Events') { libKey = 'nodeEvents'; }
    else if (lib === 'EventTarget') { libKey = 'eventTarget'; }
    else { libKey = lib.toLowerCase(); }
    
    // 最初の列はライブラリ名
    const row = [lib];
    
    // 残りの列はカラム定義に従って値を取得
    for (const column of columns) {
      const key = column.key;
      
      // 結果オブジェクトから値を取得
      let value;
      if (results[libKey]) {
        if (key === 'result' || key === 'memory') {
          value = results[libKey][key] !== undefined ? results[libKey][key] : results[libKey];
        } else {
          value = results[libKey][key];
        }
      }
      
      row.push(value);
    }
    
    return row;
  });
  
  // テーブルを生成
  return generateTable({
    headers,
    rows,
    formatters,
    paddings,
    alignRight: true
  });
}