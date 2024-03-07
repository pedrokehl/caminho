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
- [Reduce](#reduce)
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

`run`: Returns a Promise which is fulfilled when the Generator has finished providing values and all the items have been processed by all the defined steps in the Caminho flow.  
The function takes two parameters:  
- `initialValueBag: ValueBag`: An initial valueBag, which is passed through all steps.  
- `pickLastValues: string[]`: List of properties you want to be returned by run execution, only last values are executed, useful mainly for data that got aggregated with reduce.  

Simple flow:

```typescript
import { from } from 'caminho'

const caminho = from({ fn: generateCars, provides: 'carId' })
  .parallel([
    { fn: fetchPrice, maxConcurrency: 100, provides: 'price' },
    { fn: fetchSpecs, maxConcurrency: 20, provides: 'specs' },
  ])
  .pipe({ fn: mapCar, provides: 'mappedCar' })
  .pipe({ fn: saveCar, batch: { maxSize: 50, timeoutMs: 100 } })

await caminho.run({ manufacturer: 'subaru' })
```

#### Generator
`from` receives an AsyncGenerator that provides any amount of items to the subsequent steps.  
Use `maxItemsFlowing` for lossless backpressure, it limits the amount of data concurrently in the flow, useful to avoid memory overflow.  

```typescript
import { from, ValueBag } from 'caminho'

async function* generateCars(valueBag: ValueBag) {
  const limit = 50
  let page = 1
  while(true) {
    const cars = await getCarsByManufacturer(valueBag.manufacturer, { page, limit })
    for (carId of cars) yield carId
    if (cars.length < limit) {
      break
    }
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

await from({ fn: generateCars, provides: 'car' })
  .pipe({ fn: saveCars, batch: { maxSize: 50, timeoutMs: 500 }, provides: 'id' })
  .pipe({ fn: doSomethingWithCarId })
  .run()
```

#### Parallelism
`parallel()` receives an array of StepFunctions and each provided step has the same parameters and behavior as a `pipe`.  
Useful only for **Asynchronous** operations.

Comparable to [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

```typescript
await from({ fn: generateCars, provides: 'car' })
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

await from({ fn: generateCarIds, provides: 'carId' })
  .filter((valueBag: ValueBag) => valueBag.carId % 2 === 0)
  .pipe(processCarsWithEvenId)
  .run()
```

#### Reduce
Caminho features a reduce implementation in its flows, it allows to reduce through **all** records of the flow and produce an aggregated property.  
To use it, call `reduce()` with the following properties:   
- `fn: (acc: A, value: ValueBag, index: number) => A`, Similar to a callback provided to [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).
- `seed: A`: Defines the initial `acc` value received on your aggregator function.
- `provides: string`: The property name to be appended to the valueBag with the value returned from the reducer.
- `keep: string[]`: List of the properties that you want to keep the last known value in the valueBag for following steps, useful for child flows.

```typescript
function sumPrice(acc: number, item: ValueBag) {
  return acc + item.price
}

const result = await from({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: fetchPrice, provides: 'price' })
  .reduce({ fn: sumPrice, seed: 0, provides: 'sum', keep: ['manufacturer'] })
  .pipe( { fn: saveTotalForManufacturer })
  .run({ manufacturer: 'Mazda' }, ['sum', 'manufacturer'])

console.log('result', result)
// result { "sum": 1_532_600, "manufacturer": "Mazda" }
```

#### Nested Caminhos
You can combine multiple instances of Caminho in the same execution for nested generators.  
This approach works with Parallelism, Concurrency and Batching, since the run function will be treated as a normal step.  

```typescript
const childCaminho = from({ fn: generateItemsByCarId, provides: 'carItem' })
  .pipe({ fn: saveItem })

await from({ fn: generateCars, provides: 'carId' })
  .pipe({ fn: childCaminho.run })
  .run()
```

#### Logging
Caminho features a simple log mechanism which executes a syncronous callback function on every step start and finish.  
The functions can be defined with the `onStepStart` and `onStepFinished` parameter on one of the `from` flow initializers.

The **onStepStart** provides the callback with the following information:

- *name: string* - The name provided on the step definition, fallback to the name of the step function.
- *valueBags: ValueBag[]* - Array of value bags at the moment this was executed.
- *received: number* - Time of items received (this will only be greater than 1 in case it's a batch).

The **onStepFinished** provides the callback with the following information:

- *name: string* - The name provided on the step definition, fallback to the name of the step function.
- *valueBags: ValueBag[]* - Array of value bags at the moment this was executed.
- *emitted: number* - Number of items processed (this will only be greater than 1 in case it's a batch).
- *tookMs: number* - Time for the step to execute.

Example:

```typescript
await from(
    { fn: generateCars, provides: 'carId' },
    {
      onStepStarted: (log) => console.log('stepStarted', log),
      onStepFinished: (log) => console.log('stepFinished', log),
    }
  )
  // stepStarted { name: 'generateCars', received: 1, valueBags: [{}}] }
  // stepFinished { name: 'generateCars', tookMs: number, emitted: 1, valueBags: [{ carId: "1" }] }
  // stepStarted { name: 'generateCars', received: 1, valueBags: [{}] }
  // stepFinished { name: 'generateCars', tookMs: number, emitted: 1, valueBags: [{ carId: "2" }] }
  .pipe({ fn: fetchPrice, provides: 'price', name: 'customName' })
  // stepStarted { name: 'customName', received: 1, valueBags: [{ carId: "1" }] }
  // stepFinished { name: 'customName', tookMs: number, emitted: 1, valueBags: [{ carId: "1", customName: "car-1" }] }
  // stepStarted { name: 'customName', received: 1, valueBags: [{ carId: "2" }] }
  // stepFinished { name: 'customName', tookMs: number, emitted: 1, valueBags: [{ carId: "2", customName: "car-2" }] }
  .pipe({ fn: fetchSpecs, provides: 'specs', batch: { maxSize: 50, timeoutMs: 500 } })
  // stepStarted { name: 'fetchSpecs', received: 2, valueBags: [{ carId: "1", customName: "car-1" }, { carId: "2", customName: "car-2" } }] }
  // stepFinished { name: 'fetchSpecs', tookMs: number, emitted: 2, valueBags: [{ carId: "1", customName: "car-1", specs: { engineSize: 1600 } }, { carId: "2", customName: "car-2", specs: { engineSize: 2000 } }] }
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

## Roadmap

- Wrap steps in a try catch so we can call logger with the step error.
- Optional parameter in step to allow error without interrupting flow.
- Proper typing on ValueBag and how it's handled in child steps.
