import { from, ValueBag } from '../src'
import { getNumberedArray } from '../test/mocks/array.mock'
import { getMockedGenerator } from '../test/mocks/generator.mock'

async function runSubflowBenchmark(parentItems: number, childItemsPerParent: number) {
  let childProcessed = 0
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
  const childStep = {
    fn: (valueBag: ValueBag) => childCaminho.run(valueBag, steps.accumulator),
    provides: 'accumulator1',
  }
  console.timeEnd('initialize steps')
  console.time('initialize caminho')

  const childCaminho = from(steps.childGenerator, { maxItemsFlowing: 1_000 })
    .pipe(steps.batch)

  const parentCaminho = from(steps.parentGenerator, { maxItemsFlowing: 1_000 })
    .pipe(steps.pipe1)
    .pipe(childStep)
    .pipe(countSteps)
  console.timeEnd('initialize caminho')

  console.time('run caminho')
  await parentCaminho.run()
  console.timeEnd('run caminho')

  if (childProcessed !== expectedTotalChild) {
    throw new Error(`Expected to process ${expectedTotalChild} child items, but processed ${childProcessed}`)
  }
}

function initializeSteps(parentItems: number, childItemsPerParent: number) {
  const accumulatorFn = (acc: number) => acc + 1
  const parentGeneratorFn = getMockedGenerator(getNumberedArray(parentItems))
  const childGeneratorFn = getMockedGenerator(getNumberedArray(childItemsPerParent))
  const pipeFn = (valueBag: ValueBag) => ({ id: valueBag.source1, name: 'pipe1' })
  const batchFn = (valueBags: ValueBag[]) => valueBags.map(mapBagForBatch)

  return {
    parentGenerator: { fn: parentGeneratorFn, provides: 'source1' },
    childGenerator: { fn: childGeneratorFn, provides: 'subSource1' },
    batch: { fn: batchFn, provides: 'batch1', batch: { maxSize: 50, timeoutMs: 5 } },
    pipe1: { fn: pipeFn, provides: 'pipe1' },
    accumulator: { fn: accumulatorFn, seed: 0 },
  }
}

function mapBagForBatch() {
  return (valueBag: ValueBag) => ({ parentId: valueBag.source1, id: valueBag.subSource1, name: 'batch1' })
}

runSubflowBenchmark(50_000, 1_000)
