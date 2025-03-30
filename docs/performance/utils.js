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
 * Returns '-' if the input is not a valid number.
 * @param {number | any} num The number to format.
 * @returns {string} Formatted number string or '-'.
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || Number.isNaN(num)) return '-';
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
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

/**
 * Formats a benchmark result value (time in ms) for display.
 * Returns '-' if the value is not a valid number. Defaults to 2 decimal places.
 * @param {number | any} value The result value.
 * @param {number} [pad=0] Minimum width for padding.
 * @param {number} [precision=2] Number of decimal places.
 * @returns {string} Formatted result string or '-'.
 */
export function formatResult(value, pad = 0, precision = 2) {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value.toFixed(precision).padStart(pad);
  }
  return '-'.padStart(pad);
}

/**
 * Formats a memory benchmark result (per instance) for display.
 * Converts bytes to KB and formats the number. Returns '-' if invalid.
 * Expects an object with a `perInstance` property in bytes, or a direct number in bytes.
 * @param {object | number | null} memResult Memory result object or direct byte value.
 * @param {number} [pad=0] Minimum width for padding.
 * @returns {string} Formatted memory string in KB or '-'.
 */
export function formatMemory(memResult, pad = 0) {
  let bytes = null;
  if (typeof memResult === 'number' && !Number.isNaN(memResult)) {
    bytes = memResult;
  } else if (memResult && typeof memResult.perInstance === 'number' && !Number.isNaN(memResult.perInstance)) {
    bytes = memResult.perInstance;
  }

  if (bytes !== null) {
    // Convert toFixed result back to number before passing to formatNumber
    // Use Number.parseFloat instead of global parseFloat
    const kbValue = Number.parseFloat((bytes / 1024).toFixed(2));
    return formatNumber(kbValue).padStart(pad);
  }
  return '-'.padStart(pad);
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
 * @param {Array<'left' | 'right' | 'center'>} [options.alignments] 各列のアライメント ('left', 'right', 'center')
 * @returns {string} フォーマットされたテーブル文字列
 */
export function generateTable(options) {
  const { headers, rows, formatters = [], paddings = [], alignments = [] } = options;

  if (!headers || !rows || rows.length === 0) {
    return '  No data available.\n';
  }

  // Calculate column widths if not provided in paddings
  const columnWidths = headers.map((header, colIndex) => {
    if (paddings[colIndex]) {
      return paddings[colIndex];
    }
    let maxWidth = header.length;
    for (const row of rows) {
      const cell = row[colIndex];
      if (cell === undefined || cell === null) {
        maxWidth = Math.max(maxWidth, 1); // Width of '-'
        continue;
      }
      const formatter = formatters[colIndex] || ((v) => String(v));
      // Calculate width based on formatted value, removing markdown for accuracy
      const formattedValue = String(formatter(cell)).replace(/\*/g, '');
      maxWidth = Math.max(maxWidth, formattedValue.length);
    }
    return maxWidth;
  });

  // Determine alignments (default to left)
  const effectiveAlignments = headers.map((_, i) => alignments[i] || 'left');

  // Generate header row
  const headerRow = `  | ${headers
    .map((header, i) => {
      const width = columnWidths[i];
      const align = effectiveAlignments[i];
      if (align === 'right') {
        return header.padStart(width);
      }
      if (align === 'center') {
        const padLeft = Math.floor((width - header.length) / 2);
        const padRight = width - header.length - padLeft;
        return ' '.repeat(padLeft) + header + ' '.repeat(padRight);
      }
      // Default: left align
      return header.padEnd(width);
    })
    .join(' | ')} |`;

  // Generate separator row based on alignments
  const separator = `  |${columnWidths
    .map((width, i) => {
      const align = effectiveAlignments[i];
      const line = '-'.repeat(width);
      if (align === 'right') return `-${line}:`;
      if (align === 'left') return `:${line}-`;
      if (align === 'center') return `:${line}:`;
      return `-${line}-`; // Fallback (should not happen)
    })
    .join('|')}|`;

  // Generate data rows
  const dataRows = rows.map((row) => {
    return `  | ${row
      .map((cell, i) => {
        const width = columnWidths[i];
        const align = effectiveAlignments[i];
        let formattedValue;

        if (cell === undefined || cell === null) {
          formattedValue = '-';
        } else {
          const formatter = formatters[i] || ((v) => String(v));
          formattedValue = formatter(cell); // Formatter might add markdown
        }

        // Apply padding, considering markdown characters
        const displayValue = String(formattedValue);
        const valueLength = displayValue.replace(/\*/g, '').length; // Length without markdown
        const paddingNeeded = Math.max(0, width - valueLength);

        if (align === 'right') {
          return ' '.repeat(paddingNeeded) + displayValue;
        }
        if (align === 'center') {
          const padLeft = Math.floor(paddingNeeded / 2);
          const padRight = paddingNeeded - padLeft;
          return ' '.repeat(padLeft) + displayValue + ' '.repeat(padRight);
        }
        // Default: left align
        return displayValue + ' '.repeat(paddingNeeded);
      })
      .join(' | ')} |`;
  });

  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * Finds the best value in a specific column of a 2D array (rows).
 * Handles potential nested objects for memory results.
 * @param {Array<Array<any>>} rows The data rows.
 * @param {number} colIndex The index of the column to check.
 * @param {boolean} [lowerIsBetter=true] Whether a lower value is considered better.
 * @param {function} [valueAccessor=(cell) => cell] Function to extract the numeric value from a cell.
 * @returns {number | null} The best numeric value found, or null if none found.
 */
export function findBestValue(rows, colIndex, lowerIsBetter = true, valueAccessor = (cell) => cell) {
  let bestVal = null;
  for (const row of rows) {
    if (row && row.length > colIndex) {
      // Check if row and cell exist
      const cell = row[colIndex];
      const numericValue = valueAccessor(cell); // Use accessor

      if (typeof numericValue === 'number' && !Number.isNaN(numericValue)) {
        if (
          bestVal === null ||
          (lowerIsBetter && numericValue < bestVal) ||
          (!lowerIsBetter && numericValue > bestVal)
        ) {
          bestVal = numericValue;
        }
      }
    }
  }
  return bestVal;
}

/**
 * Creates a formatter function that highlights the best value in a column.
 * @param {function} baseFormatter The base formatting function (e.g., formatResult, formatMemory).
 * @param {number | null} bestValue The best value determined for the column.
 * @param {function} [valueAccessor=(cell) => cell] Function to extract the numeric value from a cell for comparison.
 * @returns {function} A new formatter function.
 */
export function createBestValueFormatter(baseFormatter, bestValue, valueAccessor = (cell) => cell) {
  return (cell) => {
    const formatted = baseFormatter(cell); // Apply base formatting first
    // If bestValue is null or formatted is '-', no highlighting needed
    if (bestValue === null || formatted === '-') return formatted;

    const originalValue = valueAccessor(cell); // Get the comparable value

    // Check if the original value matches the best value
    if (typeof originalValue === 'number' && !Number.isNaN(originalValue) && originalValue === bestValue) {
      return `**${formatted}**`; // Add Markdown bold syntax
    }
    return formatted; // Return the base formatted value if not the best
  };
}
