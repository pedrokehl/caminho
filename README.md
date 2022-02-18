[![Build Status](https://github.com/pedrokehl/caminho/workflows/Build/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/build.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Lint/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/lint.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Test/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/test.yml)
[![Build Status](https://github.com/pedrokehl/caminho/workflows/Audit/badge.svg)](https://github.com/pedrokehl/caminho/actions/workflows/audit.yml)  
**100%** Test Coverage.

# Caminho
Caminho is intended to be used for Data-Intensive Computing.  
The motivation behind Caminho is from an increased demand for data Processing systems in combination with the mainstream usage of NodeJS. The JavaScript Ecosystem urges for a tool that offers *Concurrency, Batching, Parallelism and Backpressure* in a simple and efficient manner.

### Features

- [X] Concurrency
- [X] Batching
- [X] Parallelism
- [X] Backpressure
- [X] Logging
- [X] Subflow
- [X] Reducer on subFlow
- [ ] Filtering
- [ ] Error Handling
- [X] Documentation

## Usage Instructions

#### Installation
```bash
npm install caminho
```

#### Basic Usage

`from()`: The starting point of Caminho, based on the provided Generator and its options it returns an instance of `Caminho`.  
`.pipe(..)`: Receives a StepFunction definition, provided function will receive a `ValueBag`, which holds the values provided from all the previous steps, including the generator.
`.parallel(..)` Receives StepFunction[], which will execute the steps in parallel, has the same abilities as pipe  
`.subFlow()` Enables the ability to have sub generators that can access the `parent` valueBag.  
`.run()`: Returns a Promise which is fulfilled when the Generator has finished providing values and the items have been processed by all the steps.  

A Caminho instance can be reused for multiple runs.

Example of using Caminho:

```typescript
import { from, ValueBag } from 'caminho'

async function* generateCars(valueBag: ValueBag): AsyncGenerator<number> {
  for await (const carId of generateCarsByManufacturer(valueBag.manufacturer)) yield carId
}

const caminho = from({ fn: generateCars, provides: 'carId' })
  .parallel([
    { fn: fetchPrice, maxConcurrency: 100, provides: 'price' },
    { fn: fetchSpecs, maxConcurrency: 10, provides: 'specs' },
  ])
  .pipe({ fn: mapForSave })
  .pipe({ fn: saveCarInfo, batch: { maxSize: 50, timeoutMs: 100 } })

// Just to illustrate using the same Caminho for multiple runs:
await caminho.run({ manufacturer: 'Subaru' })
await caminho.run({ manufacturer: 'Nissan' })
```

#### Concurrency

Concurrency is unlimited by default, which means a step function can be dispatched concurrently as many times as the number of items the generator provides.
You can limit the concurrency by providing `maxConcurrency` value to the `.pipe` as demonstrated below:

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
async function saveDataFn(valueBags: ValueBag[]): string[] {
  const saveResponse = await callApi(valueBags.map((valueBag) => valueBag.name))
  return saveResponse.ids
}

await from(generator)
  .pipe({ fn:saveDataFn, batch: { maxSize: 50, timeoutMs: 500 }, provides: 'id' })
  .run()
```

#### Parallelism

TODO

#### Backpressure

TODO

#### Sub Flows

TODO

#### Logging

TODO

## Contributing

#### Setup the library
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
