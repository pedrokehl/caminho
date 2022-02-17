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

Below is a simple usage of Caminho

```typescript
import { from, ValueBag } from 'caminho'

async function* generator(): AsyncGenerator<number> {
  for await (const value of [1, 2, 3]) yield value
}

await from({ fn: generator, provides: 'someNumber' })
  .pipe({ fn: (valueBag: ValueBag) => console.log(valueBag.someNumber) })
  .run()
```

#### From / Generator

TODO

#### Concurrency

Concurrency is unlimited by default, which means a step function can be dispatched concurrently as many times as the number of items the generator provides.
You can limit the concurrency by providing `maxConcurrency` value to the `.pipe` as demonstrated below:

```typescript
await from(generator)
  .pipe({ fn: (valueBag: ValueBag) => {}, maxConcurrency: 5 })
  .run()
```

#### Batching

TODO

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
