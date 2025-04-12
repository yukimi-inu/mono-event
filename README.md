# mono-event

**mono-event** is a minimal, type-safe single-event management library for JavaScript/TypeScript. It allows you to
handle individual events with a straightforward API, similar to C# events, while keeping things lightweight and
intuitive.

## Features

- **Minimal API**
  Easily add, remove, and emit events with a few function calls.
- **Type-Safe**
  Leverage TypeScript generics to ensure that event data types are checked at compile time.
- **Balanced Performance**
  Designed with a focus on balancing overall performance, memory usage, and bundle size, providing excellent results in practical use cases.
- **Tiny Bundle Size**
  Only 4.08 KB minified (1.05 KB gzipped), making it lightweight while maintaining full functionality.
- **Synchronous / Asynchronous Support**
  Choose between `mono` (synchronous) and `monoAsync` (asynchronous) versions. With `monoAsync`, you can control whether
  asynchronous listeners run sequentially or in parallel.
- **Emission Control Separation**
  With `monoRestrict` and `monoRestrictAsync`, you can separate the responsibilities of event registration (add/remove)
  and event emission, preventing accidental or unauthorized event firing.
- **Flexible Listener Registration**
  Register listeners with or without a caller context, and use the `once` option for one-time event handling.
- **Comprehensive Listener Management**
  Remove listeners by reference, by caller context, or remove all listeners at once.
- **Direct Event Emitter Integration**
  Use the `.emitter` property to easily integrate with existing event systems like DOM events.

## Installation

### Node.js

You can install mono-event via npm or yarn:

```bash
npm install mono-event
# or
yarn add mono-event
```

### Bun

```bash
bun add mono-event
```

### Deno

```ts
// Import from npm
import {mono} from "npm:mono-event";

// Or import from URL
import {mono} from "https://esm.sh/mono-event";
```

## Usage

### 1. Basic Synchronous Event (mono-event)

```ts
import {mono} from 'mono-event';

const event = mono<string>();

// Register a listener (returns an unsubscribe function)
const unsubscribe = event.add((msg) => {
  console.log("Received:", msg);
});

// Register a listener with caller context
class MyHandler {
  value = '';

  handleEvent(msg: string) {
    this.value = msg;
    console.log("Handler received:", msg);
  }
}

const handler = new MyHandler();
event.add(handler, handler.handleEvent);

// Register a one-time listener
event.add((msg) => {
  console.log("One-time event:", msg);
}, {once: true});

// Emit an event
event.emit("Hello, world!");

// Unsubscribe using the returned function
unsubscribe();

// Or remove by reference
event.remove(handler, handler.handleEvent);

// Remove all listeners
event.removeAll();

// Using the emitter property with DOM events
const keydownEvent = mono<KeyboardEvent>();
window.addEventListener('keydown', keydownEvent.emitter);

// Later, to remove:
window.removeEventListener('keydown', keydownEvent.emitter);
```

### 2. Asynchronous Event (monoAsync)

For cases where asynchronous processing is required, use `monoAsync`.
You can optionally choose between sequential (default) and parallel execution of async listeners.

```ts
import {monoAsync} from 'mono-event';

const asyncEvent = monoAsync<number>();

// Register an async listener
asyncEvent.add(async (num) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Processed:", num);
});

// Register with caller context
class AsyncProcessor {
  async process(num: number) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Processor received:", num);
  }
}

const processor = new AsyncProcessor();
asyncEvent.add(processor, processor.process);

// Register a one-time async listener
asyncEvent.add(async (num) => {
  console.log("One-time async:", num);
}, {once: true});

// Emit an event and wait for all listeners to finish
await asyncEvent.emit(42);

// Using parallel execution
const asyncEventParallel = monoAsync<number>({parallel: true});
```

### 3. Restricted Emission (monoRestrict)

When you want to clearly separate event registration from emission, use `monoRestrict`.

```ts
import {monoRestrict} from 'mono-event';

const {event, emit} = monoRestrict<string>();

// External code can register listeners using event.add()
event.add((msg) => {
  console.log("Restricted Received:", msg);
});

// With caller context
class Receiver {
  handleMessage(msg: string) {
    console.log("Receiver got:", msg);
  }
}

const receiver = new Receiver();
event.add(receiver, receiver.handleMessage);

// Remove listeners when needed
event.remove(receiver, receiver.handleMessage);
event.removeAll();

// Emission is performed via the emit() function
emit("Restricted Hello");
```

### 4. Asynchronous Restricted Emission (monoRestrictAsync)

For async events with restricted emission, use `monoRestrictAsync`.

```ts
import {monoRestrictAsync} from 'mono-event';

const {event, emit} = monoRestrictAsync<number>();

event.add(async (num) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("Async Restricted:", num);
});

// With caller context and once option
class AsyncReceiver {
  async process(num: number) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log("AsyncReceiver processed:", num);
  }
}

const receiver = new AsyncReceiver();
event.add(receiver, receiver.process, {once: true});

await emit(123);
```

### 5. Using Decorators (monoDebounce, monoThrottle)

Utility functions are provided to easily apply common patterns like debouncing and throttling to your event handlers.

```ts
import { mono, monoDebounce, monoThrottle } from 'mono-event';

const event = mono<string>();
const waitMs = 500;

// Debounced handler: Executes only after 500ms of inactivity
const debouncedHandler = monoDebounce((data) => {
  console.log(`Debounced: ${data}`);
}, waitMs);

// Throttled handler: Executes at most once every 500ms (leading + trailing edge)
const throttledHandler = monoThrottle((data) => {
  console.log(`Throttled: ${data}`);
}, waitMs);

event.add(debouncedHandler);
event.add(throttledHandler);

// Example emissions
event.emit('A'); // Throttle executes immediately
event.emit('B');
setTimeout(() => event.emit('C'), 100);
// ... (Debounce executes after 500ms pause, Throttle executes trailing calls)
```

## API Overview

### `mono<T>()`

- **Returns:**
    - `add(handler: (args: T) => void, options?: { once?: boolean }): () => void`
    - `add(caller: object, handler: (args: T) => void, options?: { once?: boolean }): () => void`
    - `remove(handler: (args: T) => void): boolean`
    - `remove(caller: object, handler: (args: T) => void): boolean`
    - `removeAll(): void`
    - `emit(args: T): void`
    - `emitter: (args: T) => void` - A function property that calls emit with the provided argument. Useful for integrating with existing event systems.

### `monoAsync<T>(options?: { parallel?: boolean })`

- **Options:**
    - `parallel`: Determines whether async listeners run in parallel (`true`) or sequentially (`false`, default)
- **Returns:**
    - `add(handler: (args: T) => Promise<void> | void, options?: { once?: boolean }): () => void`
    - `add(caller: object, handler: (args: T) => Promise<void> | void, options?: { once?: boolean }): () => void`
    - `remove(handler: (args: T) => Promise<void> | void): boolean`
    - `remove(caller: object, handler: (args: T) => Promise<void> | void): boolean`
    - `removeAll(): void`
    - `emit(args: T): Promise<void>`
    - `emitter: (args: T) => void` - A function property that calls emit with the provided argument. Useful for integrating with existing event systems.

### `monoRestrict<T>()`

- **Returns:**
    - An object `{ event, emit }` where:
        - `event`: An object with the following methods:
            - `add(handler: (args: T) => void, options?: { once?: boolean }): () => void`
            - `add(caller: object, handler: (args: T) => void, options?: { once?: boolean }): () => void`
            - `remove(handler: (args: T) => void): boolean`
            - `remove(caller: object, handler: (args: T) => void): boolean`
            - `removeAll(): void`
        - `emit(args: T): void`: A function dedicated to emitting events. This separation helps clearly define who is
          responsible for firing the event.

### `monoRestrictAsync<T>(options?: { parallel?: boolean })`

- **Options:**
    - `parallel`: Determines whether async listeners run in parallel (`true`) or sequentially (`false`, default)
- **Returns:**
    - An object `{ event, emit }` where:
        - `event`: An object with the same methods as in `monoRestrict`, but supporting async handlers
        - `emit(args: T): Promise<void>`: A function dedicated to emitting events, returning a Promise that resolves
          when all handlers have completed.

### Decorators

- **`monoDebounce<F extends Function>(func: F, wait: number): F`**
    - Creates a debounced function that delays invoking `func` until after `wait` milliseconds have elapsed since the last time the debounced function was invoked.
- **`monoThrottle<F extends Function>(func: F, wait: number): F`**
    - Creates a throttled function that only invokes `func` at most once per every `wait` milliseconds (leading + trailing edge behavior).

## Contributing

Contributions, feedback, and bug reports are welcome!
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull
requests.

## Performance

mono-event is designed with a focus on balancing overall performance, memory usage, and bundle size, rather than pursuing the absolute fastest speed for specific operations. This approach provides excellent performance and a good developer experience in many practical use cases.

The latest benchmark results are as follows:

### Performance Summary (Node.js)

  | Library          | Init (ms) | Register (Single) (ms) | Register (Multi) (ms) | Removal (Fwd) (ms) | Removal (Bwd) (ms) | Removal (Rnd) (ms) | Emit (ms) | Emit Once (ms) | Memory (Empty) (KB/inst) | Memory (100 Listeners) (KB/inst) | Comprehensive (ms) |
  |:-----------------|----------:|-------------------:|------------------:|------------------:|------------------:|------------------:|----------:|---------------:|-----------------:|--------------------:|------------:|
  | mono-event       |      5.76 |               6.17 |              6.04 |              7.35 |             75.13 |             49.36 |    205.42 |           **1.12** |             0.13 |                8.44 |     1977.62 |
  | Restrict         |         - |                  - |                 - |                 - |                 - |                 - |    209.24 |              - |                - |                   - |           - |
  | EventEmitter3    |      3.99 |               **1.72** |              2.86 |            218.14 |            210.16 |            238.02 |    240.84 |         224.64 |             **0.09** |                7.33 |     1936.56 |
  | mitt             |     58.50 |               3.85 |              8.18 |              **6.09** |             10.68 |              **9.01** |    217.67 |           6.31 |             0.49 |                **2.94** |     1999.64 |
  | nanoevents       |      **2.84** |               3.85 |              **1.68** |            220.79 |            172.63 |            178.82 |    **164.89** |         186.16 |             0.23 |               13.49 |     **1341.75** |
  | RxJS             |      4.44 |              41.54 |             79.27 |             10.73 |             12.67 |             12.83 |    372.83 |           9.33 |             0.15 |               52.50 |     5047.33 |
  | Node Events      |    101.13 |               2.64 |             30.17 |             58.35 |              **1.95** |             64.40 |    237.65 |         119.43 |             0.28 |                5.76 |     1651.50 |
  | EventTarget      |    164.45 |           12229.94 |             48.62 |            156.30 |            311.80 |            262.19 |    318.72 |         339.96 |             0.44 |                9.34 |     2735.08 |

### Performance Summary (Bun)

  | Library          | Init (ms) | Register (Single) (ms) | Register (Multi) (ms) | Removal (Fwd) (ms) | Removal (Bwd) (ms) | Removal (Rnd) (ms) | Emit (ms) | Emit Once (ms) | Comprehensive (ms) |
  |:-----------------|----------:|-------------------:|------------------:|------------------:|------------------:|------------------:|----------:|---------------:|------------:|
  | mono-event       |      2.38 |               4.59 |             12.91 |             88.04 |              **0.67** |             58.90 |    **121.48** |           **0.86** |      **696.29** |
  | Restrict         |         - |                  - |                 - |                 - |                 - |                 - |    126.51 |              - |           - |
  | EventEmitter3    |      **1.98** |               1.43 |              4.88 |            178.34 |            152.54 |            195.17 |    132.41 |         160.25 |      992.84 |
  | mitt             |     23.35 |               **0.77** |              **2.89** |              **6.35** |              9.94 |              **9.64** |    180.11 |           5.94 |     2197.11 |
  | nanoevents       |      2.20 |               1.47 |              2.91 |            158.35 |            152.67 |            182.38 |    136.22 |         160.28 |     1259.63 |
  | RxJS             |     42.25 |              12.16 |             15.99 |              7.36 |             11.22 |             11.83 |    205.36 |           6.57 |     2005.92 |
  | Node Events      |    118.95 |               1.28 |              4.19 |             60.20 |              0.91 |             34.83 |    145.26 |          75.15 |      989.63 |
  | EventTarget      |    566.28 |           13155.77 |             34.42 |            127.79 |            252.76 |            204.71 |   1164.29 |         132.11 |    12307.24 |

### Memory Usage Summary (Node.js)

| Library        |  Per Instance (KB) | With 10,000 Handlers (KB) |   1,000 Events × 100 Instances (KB) | 1,000,000 Instances (Total KB) |
|:---------------|-------------------:|--------------------------:|------------------------------------:|-------------------------------:|
| mono-event     |               0.09 |                  2,461.63 |                                   - |                     279,654.78 |
| EventEmitter3  |               0.09 |                    746.95 |                            4,376.42 |                     **162,788.71** |
| mitt           |               0.29 |                    **254.66** |                            2,287.19 |                     526,686.86 |
| nanoevents     |               0.24 |                   1,344.7 |                           15,854.79 |                     401,915.58 |
| RxJS           |               0.13 |                  6,340.63 |                           71,008.05 |                     765,941.68 |
| Node Events    |               **0.05** |                    279.98 |                                   **0** |                        247,240 |
| EventTarget    |                0.2 |                  1,044.61 |                                   - |                     535,361.14 |

*Note: `nodeEvents` and `eventTarget` results are only available in Node.js environment. Bundle size for Node.js built-ins is N/A.*
*CV: Coefficient of Variation (lower is better, indicates stability).*

You can find detailed performance benchmarks comparing mono-event with other popular event libraries (EventEmitter3,
mitt, nanoevents, RxJS, Node Events, EventTarget) in the [docs/performance](docs/performance) directory.

> **Note:** While mono-event aims for a good balance, each library has its own strengths. EventEmitter3 offers a
> familiar Node.js-like API, mitt and nanoevents prioritize minimal bundle size, and RxJS provides powerful reactive
> programming capabilities beyond simple event handling.

> **Benchmark Environment:** Performance tests were conducted on macOS with an Apple M2 Ultra processor. Results are the
> average of 3 runs with the configurations specified in `docs/performance/benchmark.js`.

To run the benchmarks yourself:

```bash
# Install benchmark dependencies
npm install eventemitter3 mitt nanoevents rxjs --save-dev

# Build the library
npm run build

# Run benchmarks with Node.js (all scenarios)
node --expose-gc docs/performance/benchmark.js
# Or run specific scenarios by number (e.g., 7 for Emission, 11 for Comprehensive)
node --expose-gc docs/performance/benchmark.js 7 11

# Run benchmarks with Bun (all scenarios)
# Note: Memory results might be inaccurate in Bun due to GC differences.
bun --gc-expose docs/performance/benchmark.js
# Or run specific scenarios by number
bun --gc-expose docs/performance/benchmark.js 7 11

# Run benchmarks with Deno (all scenarios)
# Note: Memory results might be inaccurate in Deno due to GC differences.
# Requires network, read, and env permissions for dependencies and timing.
deno run --import-map deno.importmap.json --allow-net --allow-read --allow-env docs/performance/benchmark.js
# Or run specific scenarios by number
deno run --import-map deno.importmap.json --allow-net --allow-read --allow-env docs/performance/benchmark.js 7 11
```

Note: The benchmark dependencies are not included in the package by default to keep it lightweight.

## Testing with Bun and Deno

This library is fully compatible with Bun and Deno. You can run the tests in each environment:

### Bun

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Run tests with Bun
npm run test:bun
# or directly
bun test bun.test.ts
```

### Deno

```bash
# Install Deno if you haven't already
curl -fsSL https://deno.land/install.sh | sh

# Run tests with Deno
npm run test:deno
# or directly
deno test deno.test.ts --import-map=deno.importmap.json
```

## Credits

mono-event was designed by [yukimi-inu](https://github.com/yukimi-inu) with coding assistance from Roo Code (Claude 3.7
Sonnet).

## License

This project is licensed under the MIT License.
