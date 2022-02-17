import { from, ValueBag } from '../src'
import { getNumberedArray } from '../test/mocks/array.mock'
import { getMockedGenerator } from '../test/mocks/generator.mock'

async function runSubflowBenchmark(parentItems: number, childItemsPerParent: number) {
  const expectedTotalChild = parentItems * childItemsPerParent
  console.log('---- Starting Benchmark ----')
  console.log(`Parent Items: ${parentItems}`)
  console.log(`Child Items: ${expectedTotalChild}`)

  console.time('initialize steps')
  const steps = initializeSteps(parentItems, childItemsPerParent)
  const countSteps = {
    fn: (valueBag: ValueBag) => {
      childProcessed += valueBag.accumulator1
    },
  }
  console.timeEnd('initialize steps')

  let childProcessed = 0

  console.time('initialize caminho')
  const benchmarkCaminho = from(steps.parentGenerator)
    .pipe(steps.pipe1)
    .subFlow((sub) => sub(steps.childGenerator)
      .pipe(steps.batch)
      .reduce(steps.accumulator))
    .pipe(countSteps)
  console.timeEnd('initialize caminho')

  console.time('run caminho')
  await benchmarkCaminho.run()
  console.timeEnd('run caminho')

  if (childProcessed !== expectedTotalChild) {
    throw new Error(`Expected to process ${expectedTotalChild} child items, but processed ${childProcessed}`)
  }
}

function initializeSteps(parentItems: number, childItemsPerParent: number) {
  const accumulatorFn = (acc: number) => acc + 1
  const parentGeneratorFn = getMockedGenerator(getNumberedArray(parentItems))
  const childGeneratorFn = getMockedGenerator(getNumberedArray(childItemsPerParent))
  const pipeFn = (valueBag) => ({ id: valueBag.source1, name: 'pipe1' })
  const mapBagForBatch = () => (valueBag) => ({ parentId: valueBag.source1, id: valueBag.subSource1, name: 'batch1' })
  const batchFn = (valueBags) => valueBags.map(mapBagForBatch)

  return {
    parentGenerator: { fn: parentGeneratorFn, maxItemsFlowing: 1_000, provides: 'source1' },
    childGenerator: { fn: childGeneratorFn, maxItemsFlowing: 1_000, provides: 'subSource1' },
    batch: { fn: batchFn, provides: 'batch1', batch: { maxSize: 50, timeoutMs: 5 } },
    pipe1: { fn: pipeFn, provides: 'pipe1' },
    accumulator: { fn: accumulatorFn, seed: 0, provides: 'accumulator1' },
  }
}

runSubflowBenchmark(50_000, 1_000)
