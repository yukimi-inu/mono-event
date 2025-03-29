// Run all benchmark scripts
import { execSync } from 'node:child_process';

console.log('=== Running mono-event Performance Benchmarks ===\n');

try {
  // Run main performance benchmark
  console.log('1. Running main performance benchmark...\n');
  execSync('node --expose-gc docs/performance/benchmark.js', {
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  // Run bundle size comparison
  console.log('\n2. Running bundle size comparison...\n');
  execSync('node docs/performance/bundle-size.js', {
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  // Run memory usage benchmark
  console.log('\n3. Running memory usage benchmark...\n');
  execSync('node --expose-gc docs/performance/memory-benchmark.js', {
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  // Note: Async benchmarks are disabled as they take too long to run
  // To run async benchmarks, uncomment the following lines:
  /*
  console.log('\n4. Running asynchronous benchmarks...\n');
  execSync('node docs/performance/async-benchmark.js', {
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  */

  console.log('\n=== All benchmarks completed successfully ===');
  console.log('See docs/performance/RESULTS.md for detailed analysis');
} catch (error) {
  console.error('Error running benchmarks:', error);
}
