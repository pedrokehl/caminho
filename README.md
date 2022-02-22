[![Build Status](https://github.com/pedrokehl/caminho/workflows/Build/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/build.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Lint/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/lint.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Test/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/test.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Audit/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/audit.yml)  
**100%** Test Coverage.

# Caminho
Caminho is intended to be used for Data-Intensive Computing.  
The motivation behind Caminho is from an increased demand for data processing systems in combination with the mainstream usage of NodeJS. The JavaScript Ecosystem urges for a tool that offers *Concurrency, Batching, Parallelism and Backpressure* in a simple and efficient manner.

### Features

- [Concurrency](#concurrency)
- [Batching](#batching)
- [Parallelism](#parallelism)
- [Backpressure](#generator)
- [Filtering](#filtering)
- [Aggregation](#aggregation)
- [Logging](#logging)

## Usage Instructions

#### Installation
```bash
npm install caminho
```

#### Basic Usage
`from()` is the starting point of Caminho, which returns a `Caminho` instance based on the provided AsyncGenerator.  

*A Caminho instance contains the following methods to define the flow:*  

`pipe` receives a StepFunction definition, provided function will receive a `ValueBag`, which holds the values provided from all the previous steps, including the generator, if the step has `provides`, the value will be added to the `ValueBag` accordingly.  
`parallel` receives StepFunction[], which will execute the steps in parallel, has the same abilities as pipe.  
`filter` Filter items emitted by the previous step by only emitting those that satisfy the specified predicate, so the subsequent steps won't receive it.

*After the steps are all defined execute your Caminho flow by calling `.run()`.*  

`run` receives an optional Initial Bag, and optional aggregator. Returns a Promise which is fulfilled when the Generator has finished providing values and the items have been processed by all the defined steps in the Caminho instance.

Simple flow:

```typescript
import { from } from 'caminho'

const caminho = from({ fn: generateCars, provides: 'carId' })
  .parallel([
    { fn: fetchPrice, maxConcurrency: 100, provides: 'price' },
    { fn: fetchSpecs, maxConcurrency: 20, provides: 'specs' },
  ])
  .pipe({ fn: mapForSaveWithTotals })
  .pipe({ fn: saveCarInfo, batch: { maxSize: 50, timeoutMs: 100 } })

await caminho.run({ manufacturer: 'subaru' })
```

#### Generator
`from` receives an AsyncGenerator that provides any amount of items to the subsequent steps.  
Use `maxItemsFlowing` for lossless backpressure, it limits the amount of data concurrently in the flow, useful to avoid memory overflow.  

```typescript
import { from, ValueBag } from 'caminho'

async function* generateCars(valueBag: ValueBag) {
  let page = 1
  while(true) {
    const cars = await getCarsByManufacturer(valueBag.manufacturer, { page, limit: 100 })
    if (!cars.length) {
      break
    }
    for (carId of cars) yield carId
    page++
  }
}

await from({ fn: generateCars, provides: 'carId' }, { maxItemsFlowing: 1_000 })
  .pipe( fn: doSomething })
  .run({ manufacturer: 'nissan' })
```

#### Concurrency
Concurrency is unlimited by default, which means a step function can be dispatched concurrently as many times as the number of items the generator provides.  
You can limit the concurrency by providing `maxConcurrency` option on a step definition, this is useful when you use an API that can't handle too many concurrent requests.  

```typescript
await from(generator)
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
async function saveCars(valueBags: ValueBag[]): string[] {
  const cars = valueBags.map((valueBag) => valueBag.car)
  const response = await saveManyCars(cars)
  return response.ids
}

await from(generateCars)
  .pipe({ fn: saveCars, batch: { maxSize: 50, timeoutMs: 500 }, provides: 'id' })
  .pipe({ fn: doSomethingWithCarId })
  .run()
```

#### Parallelism
`parallel()` receives an array of StepFunctions and each provided step has the same parameters and behavior as a `pipe`.  
Useful only for **Asynchronous** operations.

Comparable to [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

```typescript
await from({ fn: generateCars, provides: 'carId' })
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

await from({ fn: generateCars, provides: 'carId' })
  .filter((valueBag: ValueBag) => valueBag.carId % 2 === 0)
  .pipe(processCarsWithEvenId)
  .run()
```

#### Aggregation
Caminho features a simple aggregation for a Caminho execution, which can be different for each `run` call.  

It consists of two properties:   
- `fn: (acc: A, value: ValueBag, index: number) => A`, Similar to a callback provided to Array.reduce, where the first parameter is the aggregated value, value is the item received from the flow, and index is the position of the item received.  
- `seed: A`: Which defines the initial value received on your aggregator function

Comparable to [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)

```typescript
function sumPrice(acc: number, item: ValueBag) {
  return acc + item.price
}
const sumPriceAggregator = { fn: sumPrice, seed: 0 }

await from({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: fetchPrice, provides: 'price' })
  .run({}, sumPriceAggregator)
```

#### Nested Caminhos
You can combine multiple instances of Caminho in the same execution for nested generators.  
This approach works with Parallelism, Concurrency and Batching, since the run function will be treated as a normal step.  

```typescript
const childCaminho = from({ generateItemsByCarId, provides: 'carItem' })
  .pipe({ fn: saveItem })

await from({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: childCaminho.run })
  .run()
```

#### Logging
Caminho features a simple log mechanism which executes a syncronous callback function on every step executed.  
The function needs to be defined via the `onEachStep` parameter on the `from`.

Every step execution, calls the `onEachStep` step, it provides the callback with the following information:

- `name: string` - The `name` parameter on the step definition, defaults to the step function name - `step.fn.name`.  
- `tookMs: number` - Time for the step to execute.  
- `emitted: number` - Number of items processed, useful for batch operations

Example of how the calls to `onEachStep` looks like:

```typescript
await from({ fn: generateCars, provides: 'carId' }, { onEachStep: console.log })
  // { name: 'generateCars', tookMs: number, emitted: 1 }
  // { name: 'generateCars', tookMs: number, emitted: 1 }
  .pipe({ fn: fetchPrice, provides: 'price', name: 'customName' })
  // { name: 'customName', tookMs: number, emitted: 1 }
  // { name: 'customName', tookMs: number, emitted: 1 }
  .pipe({ fn: fetchSpecs, provides: 'specs', batch: { maxSize: 50, timeoutMs: 500 } })
  // { name: 'fetchSpecs', tookMs: number, emitted: 2 }
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
npm test:watch
```
