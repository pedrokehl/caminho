[![Build Status](https://github.com/pedrokehl/caminho/workflows/Build/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/build.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Lint/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/lint.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Test/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/test.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Audit/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/audit.yml)  
**100%** Test Coverage.

# Caminho
Tool for creating efficient data pipelines in a JavaScript environment.  
The motivation behind Caminho is from an increased demand for data processing systems in combination with the mainstream usage of NodeJS for IO tasks. The JavaScript Ecosystem urges for a tool that offers *Concurrency, Batching, Parallelism and Backpressure* in a simple and efficient manner.

### Features

- [Concurrency](#concurrency)
- [Batching](#batching)
- [Parallelism](#parallelism)
- [Backpressure](#generator)
- [Filtering](#filtering)
- [Reduce](#reduce)
- [Logging](#logging)
- [Error handling](#error-handling)

## Usage Instructions

#### Installation
```bash
npm install caminho
# or
deno add @pedrokehl/caminho
```

#### Basic Usage
`fromGenerator()` is the starting point of Caminho, which returns a `Caminho` instance based on the provided AsyncGenerator.  

*A Caminho instance contains the following methods to define the flow:*  

`pipe` receives a StepFunction definition, the provided function will receive a `ValueBag`, which contains the cumulative values from the previous steps, including the generator, if the step has `provides`, the value will be added to the `ValueBag` accordingly.  
`parallel` receives StepFunction[], and it will execute the steps in parallel, it has the same abilities as pipe.  
`filter` Filter items emitted by the previous step by only emitting those that satisfy the specified predicate, so the subsequent steps won't receive it.  
`reduce` Allows to reduce through all records of the flow and produce an aggregated property.

*After the steps definition, execute your Caminho flow by calling `.run()`.*  

`run`: Returns a Promise which is fulfilled when the Generator has finished providing values and all the items have been processed by all the defined steps in the Caminho flow.  
The function takes an initial valueBag as parameter, which is passed to the child steps, and the returned value from the promise is an object that contains the context of the last execution of the flow.

Simple flow:

```typescript
import { fromGenerator } from 'caminho'

const caminho = fromGenerator({ fn: generateCars, provides: 'carId' })
  .parallel([
    { fn: fetchPrice, maxConcurrency: 100, provides: 'price' },
    { fn: fetchSpecs, maxConcurrency: 20, provides: 'specs' },
  ])
  .pipe({ fn: mapCar, provides: 'mappedCar' })
  .pipe({ fn: saveCar, batch: { maxSize: 50, timeoutMs: 100 } })

await caminho.run({ manufacturer: 'subaru' })
```

#### Generator
`fromGenerator` receives an AsyncGenerator that provides any amount of items to the subsequent steps.  
Use `maxItemsFlowing` for lossless backpressure, it limits the amount of data concurrently in the flow, useful to avoid memory overflow.  
Keep in mind the `maxItemsFlowing` budget is shared between concurrent `run()` calls on the same Caminho instance.  

```typescript
import { fromGenerator, ValueBag } from 'caminho'

async function* generateCars(valueBag: ValueBag) {
  const limit = 50
  let page = 1
  while(true) {
    const cars = await getCarsByManufacturer(valueBag.manufacturer, { page, limit })
    for (const carId of cars) yield carId
    if (cars.length < limit) {
      break
    }
    page++
  }
}

await fromGenerator({ fn: generateCars, provides: 'carId' }, { maxItemsFlowing: 1_000 })
  .pipe({ fn: doSomething })
  .run({ manufacturer: 'nissan' })
```

#### Other entry points
Besides `fromGenerator`, a flow can start from data you already have at hand. All entry points share the same options (`maxItemsFlowing`, `onStepStarted`, `onStepFinished`) and the same `provides` semantics.

`fromArray` runs the flow once per item of an array:

```typescript
import { fromArray } from 'caminho'

await fromArray({ items: ['WBA123', 'JTD456'], provides: 'vin' })
  .pipe({ fn: fetchCarByVin, provides: 'car' })
  .run()
```

`fromValue` runs the flow exactly once, for the single provided item:

```typescript
import { fromValue } from 'caminho'

await fromValue({ item: 'WBA123', provides: 'vin' })
  .pipe({ fn: fetchCarByVin, provides: 'car' })
  .run()
```

`fromFn` runs the flow exactly once, with the value returned (or resolved) by the function. The function receives the `initialBag` passed to `run()`:

```typescript
import { fromFn } from 'caminho'

await fromFn({ fn: (bag) => fetchNewestCar(bag.manufacturer), provides: 'car' })
  .pipe({ fn: saveCar })
  .run({ manufacturer: 'honda' })
```

#### Concurrency
Concurrency is unlimited by default, which means a step function can be dispatched concurrently as many times as the number of items the generator provides.  
You can limit the concurrency by providing `maxConcurrency` option on a step definition, this is useful when you use an API that can't handle too many concurrent requests.  
Values are emitted in completion order, not in the order the generator produced them, so a slow item never blocks faster ones behind it.  

```typescript
await fromGenerator({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: (valueBag: ValueBag) => {}, maxConcurrency: 5 })
  .run()
```

#### Batching
Batching can be achieved by providing the batch option on a StepFunction, it works in combination with concurrency, and can be used both in the `pipe` or `parallel` methods.  

A batch configuration consists of two parameters:  
`maxSize`: Defines the maximum number of items that a batch can contain.  
`timeoutMs`: Time for a batch to be dispatched if the maxSize is not achieved before.  

Your batch step can also provide values to the ValueBag, but keep in mind that the order of the returned values must be the same order you received the ValueBag, so it gets merged and is properly assigned to the next `pipe`.  

```typescript
async function saveCars(valueBags: ValueBag[]): Promise<string[]> {
  const cars = valueBags.map((valueBag) => valueBag.car)
  const response = await saveManyCars(cars)
  return response.ids
}

await fromGenerator({ fn: generateCars, provides: 'car' })
  .pipe({ fn: saveCars, batch: { maxSize: 50, timeoutMs: 500 }, provides: 'id' })
  .pipe({ fn: doSomethingWithCarId })
  .run()
```

#### Parallelism
`parallel()` receives an array of StepFunctions and each provided step has the same parameters and behavior as a `pipe`.  
Useful only for **Asynchronous** operations.

Comparable to [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

```typescript
await fromGenerator({ fn: generateCars, provides: 'car' })
  .parallel([
    { fn: fetchPrice, provides: 'price', maxConcurrency: 100 },
    { fn: fetchSpecs, provides: 'specs', maxConcurrency: 5, batch: { maxSize: 20, timeoutMs: 100 } },
  ])
  .run()
```

#### Filtering
`filter()` receives a predicate, to test item of the Flow, the predicate should return a value that coerces to true to keep the element, or to false otherwise.

Comparable to [Array.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)

```typescript

await fromGenerator({ fn: generateCars, provides: 'car' })
  .filter({ fn: ({ car }: { car: Car }) => car.price >= 100_000 })
  .pipe({ fn: processCarsThatCosts100kOrMore })
  .run()
```

#### Reduce
Caminho features a reduce implementation in its flows, it allows to reduce through **all** records of the flow and produce an aggregated property.  
To use it, call `reduce()` with the following properties:   
- `fn: (acc: A, value: ValueBag, index: number) => A`, Similar to a callback provided to [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).
- `seed: A`: Defines the initial `acc` value received on your aggregator function.
- `provides: string`: The property name to be appended to the valueBag with the value returned from the reducer.
- `keep: string[]`: Optional list of the properties that you want to keep the last known value in the valueBag for following steps, by default it keeps only the reduce result.

```typescript
function sumPrice(acc: number, item: ValueBag) {
  return acc + item.price
}

const result = await fromGenerator({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: fetchPrice, provides: 'price' })
  .reduce({ fn: sumPrice, seed: 0, provides: 'sum', keep: ['manufacturer'] })
  .pipe({ fn: saveTotalForManufacturer })
  .run({ manufacturer: 'Mazda' })

console.log('result', result)
// result { "sum": 1_532_600, "manufacturer": "Mazda" }
```

#### TypeScript
The bag type is accumulated automatically as the flow is defined: every `provides` adds a property (re-providing an existing key replaces its type), `parallel` merges the values of all its branches, and `reduce` replaces the bag with the aggregation plus the properties listed in `keep`.  
No annotations are required, and untyped flows keep working since the bag defaults to `any`.

```typescript
const flow = fromArray({ items: [1, 2, 3], provides: 'n' })
  .pipe({ fn: ({ n }) => n * 10, provides: 'tens' })   // bag is { n: number }
  .pipe({ fn: ({ n, tens }) => {} })                   // bag is { n: number, tens: number }

const result = await flow.run()                        // result is { n: number, tens: number }
result.other                                           // compile error: bags are closed
```

Typed bags are **closed**: only declared properties are accessible. To use `run(initialBag)` properties in a typed flow, declare them by annotating the generator/fn parameter of `fromGenerator` or `fromFn` — they become part of the bag type for every step:

```typescript
async function* generateCars(initialBag: { manufacturer: string }) { /* ... */ }

const flow = fromGenerator({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: ({ manufacturer, carId }) => {} })  // bag is { manufacturer: string, carId: string }

await flow.run({ manufacturer: 'subaru' })
```

Annotating the parameter as `ValueBag` (or omitting it) keeps the flow untyped.

Note: steps receive a copy of the ValueBag, mutating it inside a step does not affect other steps, use `provides` to add values to the bag.

#### Nested Caminhos
You can combine multiple instances of Caminho in the same execution for nested generators.  
This approach works with Parallelism, Concurrency and Batching, since the run function will be treated as a normal step.  

```typescript
const childCaminho = fromGenerator({ fn: generateItemsByCarId, provides: 'carItem' })
  .pipe({ fn: saveItem })

await fromGenerator({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: childCaminho.run })
  .run()
```

#### Logging
Caminho features a simple log mechanism which executes a syncronous callback function on every step start and finish.  
The functions can be defined with the `onStepStarted` and `onStepFinished` parameter on one of the `from` flow initializers.

The **onStepStarted** provides the callback with the following information:

- *name: string* - The name provided on the step definition, fallback to the name of the step function.
- *valueBags: ValueBag[]* - Array of value bags at the moment this was executed.
- *received: number* - Number of items received (this will only be greater than 1 in case it's a batch).

The **onStepFinished** provides the callback with the following information:

- *name: string* - The name provided on the step definition, fallback to the name of the step function.
- *valueBags: ValueBag[]* - Array of value bags at the moment this was executed.
- *emitted: number* - Number of items processed (this will only be greater than 1 in case it's a batch).
- *tookMs: number* - Time for the step to execute.

Example:

```typescript
await fromGenerator(
    { fn: generateCars, provides: 'carId' },
    {
      onStepStarted: (log) => console.log('stepStarted', log),
      onStepFinished: (log) => console.log('stepFinished', log),
    }
  )
  // stepStarted { name: 'generateCars', received: 1, valueBags: [{}] }
  // stepFinished { name: 'generateCars', tookMs: number, emitted: 1, valueBags: [{ carId: "1" }] }
  // stepStarted { name: 'generateCars', received: 1, valueBags: [{}] }
  // stepFinished { name: 'generateCars', tookMs: number, emitted: 1, valueBags: [{ carId: "2" }] }
  .pipe({ fn: fetchPrice, provides: 'price', name: 'customName' })
  // stepStarted { name: 'customName', received: 1, valueBags: [{ carId: "1" }] }
  // stepFinished { name: 'customName', tookMs: number, emitted: 1, valueBags: [{ carId: "1", price: 20_000 }] }
  // stepStarted { name: 'customName', received: 1, valueBags: [{ carId: "2" }] }
  // stepFinished { name: 'customName', tookMs: number, emitted: 1, valueBags: [{ carId: "2", price: 35_000 }] }
  .pipe({ fn: fetchSpecs, provides: 'specs', batch: { maxSize: 50, timeoutMs: 500 } })
  // stepStarted { name: 'fetchSpecs', received: 2, valueBags: [{ carId: "1", price: 20_000 }, { carId: "2", price: 35_000 }] }
  // stepFinished { name: 'fetchSpecs', tookMs: number, emitted: 2, valueBags: [{ carId: "1", price: 20_000, specs: { engineSize: 1600 } }, { carId: "2", price: 35_000, specs: { engineSize: 2000 } }] }
  .run()
```

#### Error handling
An error thrown (or rejected) by the generator or by any step rejects the `run()` promise with that error, and the flow is torn down:

- No further values are pulled from the generator, and the generator is **closed**: its `finally` blocks run, so resources like connections or cursors can be released even if the failure happened elsewhere in the flow.
- The failing step's `onStepFinished` callback receives the `error`, which makes it a good place for logging.
- In a `batch` step, a thrown error fails the run as a whole, there is no per-item isolation within a batch.
- Errors don't leak across concurrent runs: other `run()` calls on the same instance keep going, and the failed run releases its share of the `maxItemsFlowing` budget, so `getNumberOfItemsFlowing()` is accurate after any run settles, successfully or not.

There is no built-in retry or per-item error channel: if an item is allowed to fail without aborting the run, catch the error inside the step function and represent it as a value in the bag.

```typescript
await fromGenerator({ fn: generateCars, provides: 'carId' })
  .pipe({
    fn: async ({ carId }) => {
      try {
        return { ok: true, price: await fetchPrice(carId) }
      } catch (error) {
        return { ok: false, error }
      }
    },
    provides: 'priceResult',
  })
  .filter({ fn: ({ priceResult }) => priceResult.ok })
  .pipe({ fn: savePrice })
  .run()
```

## Contributing

#### Setup
```bash
git clone https://github.com/pedrokehl/caminho
cd caminho
npm install
```

#### Testing changes
```bash
npm test
or
npm run test:watch
```
