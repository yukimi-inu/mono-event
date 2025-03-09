# mono-event

**mono-event** is a minimal, type-safe single-event management library for JavaScript/TypeScript. It allows you to handle individual events with a straightforward API, similar to C# events, while keeping things lightweight and intuitive.

## Features

- **Minimal API**  
  Easily add, remove, and emit events with a few function calls.
- **Type-Safe**  
  Leverage TypeScript generics to ensure that event data types are checked at compile time.
- **Synchronous / Asynchronous Support**  
  Choose between `mono` (synchronous) and `monoAsync` (asynchronous) versions. With `monoAsync`, you can control whether asynchronous listeners run sequentially or in parallel.
- **Emission Control Separation**  
  With `monoRestrict` and `monoRestrictAsync`, you can separate the responsibilities of event registration (add/remove) and event emission, preventing accidental or unauthorized event firing.
- **Flexible Listener Registration**  
  Register listeners with or without a caller context, and use the `once` option for one-time event handling.
- **Comprehensive Listener Management**  
  Remove listeners by reference, by caller context, or remove all listeners at once.

## Installation

You can install mono-event via npm or yarn:

```bash
npm install mono-event
# or
yarn add mono-event
```

## Usage

### 1. Basic Synchronous Event (mono-event)

```ts
import { mono } from 'mono-event';

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
}, { once: true });

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
import { monoAsync } from 'mono-event';

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
}, { once: true });

// Emit an event and wait for all listeners to finish
await asyncEvent.emit(42);

// Using parallel execution
const asyncEventParallel = monoAsync<number>({ parallel: true });
```

### 3. Restricted Emission (monoRestrict)

When you want to clearly separate event registration from emission, use `monoRestrict`.

```ts
import { monoRestrict } from 'mono-event';

const { event, emit } = monoRestrict<string>();

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
import { monoRestrictAsync } from 'mono-event';

const { event, emit } = monoRestrictAsync<number>();

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
event.add(receiver, receiver.process, { once: true });

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
    - `emit(args: T): void`: A function dedicated to emitting events. This separation helps clearly define who is responsible for firing the event.

### `monoRestrictAsync<T>(options?: { parallel?: boolean })`
- **Options:**  
  - `parallel`: Determines whether async listeners run in parallel (`true`) or sequentially (`false`, default)
- **Returns:**  
  - An object `{ event, emit }` where:
    - `event`: An object with the same methods as in `monoRestrict`, but supporting async handlers
    - `emit(args: T): Promise<void>`: A function dedicated to emitting events, returning a Promise that resolves when all handlers have completed.

## Contributing

Contributions, feedback, and bug reports are welcome!  
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License.
