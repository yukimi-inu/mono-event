# mono-event

**mono-event** is a minimal, type-safe single-event management library for JavaScript/TypeScript. It allows you to
handle individual events with a straightforward API, similar to C# events, while keeping things lightweight and
intuitive.

## Features

- **Minimal API**
  Easily add, remove, and emit events with a few function calls.
- **Type-Safe**
  Leverage TypeScript generics to ensure that event data types are checked at compile time.
- **High-Performance**
  Optimized for speed and efficiency, with up to 1.5x faster event emission than EventEmitter3 and 600x faster one-time
  event handling than nanoevents.
- **Tiny Bundle Size**
  Only 3.40 KB minified (975 B gzipped), making it lightweight while maintaining full functionality.
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

## API Overview

### `mono<T>()`

- **Returns:**
    - `add(handler: (args: T) => void, options?: { once?: boolean }): () => void`
    - `add(caller: object, handler: (args: T) => void, options?: { once?: boolean }): () => void`
    - `remove(handler: (args: T) => void): boolean`
    - `remove(caller: object, handler: (args: T) => void): boolean`
    - `removeAll(): void`
    - `emit(args: T): void`

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

## Contributing

Contributions, feedback, and bug reports are welcome!  
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull
requests.

## Performance

mono-event is designed to be extremely high-performance and memory-efficient. Extensive benchmarks show that it
significantly outperforms other popular event libraries:

### Performance Comparison (average of 3 runs)

| Library       | Init (ms) | Register (ms) | Remove (ms) | Emit (ms) | Emit Once (ms) | Bundle Size                |
|---------------|-----------|---------------|-------------|-----------|----------------|----------------------------|
| mono-event    | 0.993     | **26.062**    | **5.510**   | 937.289   | **0.322**      | 3.40 KB (975 B gzipped)    |
| EventEmitter3 | **0.764** | 35.818        | 256.709     | 1369.783  | 0.395          | 8.93 KB (2.28 KB gzipped)  |
| mitt          | 7.789     | 27.057        | 38.042      | 982.817   | 5.353          | **349 B (218 B gzipped)**  |
| nanoevents    | 0.877     | 78.741        | 212.609     | **636.952** | 193.432      | 422 B (227 B gzipped)      |
| RxJS          | 0.896     | 180.773       | 39.614      | 2858.536  | 0.431          | 34.31 KB (4.34 KB gzipped) |

### Memory Usage Comparison

| Library       | Per Instance | With 500 Handlers | 1,000 Events × 100 Instances | 100,000 Instances | Bundle Size                |
|---------------|--------------|-------------------|------------------------------|-------------------|----------------------------|
| mono-event    | 0.18 KB      | 241.91 KB         | -                            | 21,884.91 KB      | 3.40 KB (975 B gzipped)    |
| EventEmitter3 | **0.10 KB**  | **36.49 KB**      | 4,052.32 KB                  | **6,710.36 KB**   | 8.93 KB (2.28 KB gzipped)  |
| mitt          | 0.51 KB      | 38.51 KB          | **1,442.74 KB**              | 44,460.73 KB      | **349 B (218 B gzipped)**  |
| nanoevents    | 0.26 KB      | 90.10 KB          | 15,893.22 KB                 | 31,636.95 KB      | 422 B (227 B gzipped)      |
| RxJS          | 0.15 KB      | 359.48 KB         | 70,968.35 KB                 | 68,264.93 KB      | 34.31 KB (4.34 KB gzipped) |

Key performance advantages:

- **Event emission is up to 1.5× faster** than EventEmitter3
- **One-time event handling is up to 600× faster** than nanoevents
- **Listener removal is up to 47× faster** than EventEmitter3
- **Balanced bundle size** with full functionality (only 3.40 KB minified, 975 B gzipped)

While mono-event uses more memory than some alternatives (as shown in the memory comparison table), this is a deliberate trade-off to achieve superior performance and functionality. The memory usage is still reasonable for most applications, and the performance benefits often outweigh the additional memory cost.

These optimizations make mono-event particularly well-suited for applications with:

- High-frequency event emissions
- Extensive use of one-time event listeners
- Large numbers of event listeners
- Performance-critical code paths
- Applications where event handling speed is more critical than memory footprint

You can find detailed performance benchmarks comparing mono-event with other popular event libraries (EventEmitter3,
mitt, nanoevents, RxJS) in the [docs/performance](docs/performance) directory.

> **Note:** While mono-event excels in raw performance, each library has its own strengths. EventEmitter3 offers a
> familiar Node.js-like API, mitt and nanoevents prioritize minimal bundle size, and RxJS provides powerful reactive
> programming capabilities beyond simple event handling.

> **Benchmark Environment:** Performance tests were conducted on macOS with an Apple M2 Ultra processor. Results are the
> average of 3 runs with 500,000 iterations and 500 listeners per event.

To run the benchmarks yourself:

```bash
# Install benchmark dependencies
npm install eventemitter3 mitt nanoevents rxjs --save-dev

# Build the library
npm run build

# Run benchmarks
node docs/performance/run-benchmark.js
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
