import { from } from '../src'
import { getNumberedArray } from '../test/mocks/array.mock'
import { getMockedGenerator } from '../test/mocks/generator.mock'

async function runSubflowBenchmark(parentItems: number, childItemsPerParent: number) {
  console.log(`Initialized with ${parentItems} parent items, and ${parentItems * childItemsPerParent} child items.`)

  console.time('initialize steps')
  const steps = initializeSteps(parentItems, childItemsPerParent)
  console.timeEnd('initialize steps')

  console.time('initialize caminho')
  const benchmarkCaminho = from(steps.parentGenerator)
    .pipe(steps.pipe1)
    .subFlow(from(steps.childGenerator)
      .pipe(steps.batch), steps.accumulator)
    .pipe(steps.pipe2)
  console.timeEnd('initialize caminho')

  console.time('run caminho')
  await benchmarkCaminho.run()
  console.timeEnd('run caminho')
}

function initializeSteps(parentItems: number, childItemsPerParent: number) {
  const accumulatorFn = (acc: number) => acc + 1
  const parentGeneratorFn = getMockedGenerator(getNumberedArray(parentItems))
  const childGeneratorFn = getMockedGenerator(getNumberedArray(childItemsPerParent))
  const pipeFn = async () => 'something'
  const batchFn = () => []

  return {
    parentGenerator: { fn: parentGeneratorFn, maxItemsFlowing: 1_000, provides: 'source1' },
    childGenerator: { fn: childGeneratorFn, maxItemsFlowing: 1_000, provides: 'subSource1' },
    batch: { fn: batchFn, provides: 'batch1', options: { batch: { maxSize: 50, timeoutMs: 5 } } },
    pipe1: { fn: pipeFn, provides: 'pipe1' },
    pipe2: { fn: pipeFn, provides: 'pipe2' },
    accumulator: { fn: accumulatorFn, seed: 0, provides: 'accumulator1' }
  }
}

runSubflowBenchmark(5_0000, 1000)
