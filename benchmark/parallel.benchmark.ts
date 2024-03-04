import { from, ValueBag } from '../src'
import { getNumberedArray } from '../test/mocks/array.mock'
import { getMockedGenerator } from '../test/mocks/generator.mock'

async function runParallelBenchmark(parentItems: number, childItemsPerParent: number) {
  const expectedTotalChild = parentItems * childItemsPerParent
  console.log('---- Starting Benchmark ----')
  console.log(`Parent Items: ${parentItems}`)
  console.log(`Child Items: ${expectedTotalChild}`)

  console.time('initialize steps')
  const steps = initializeSteps(parentItems, childItemsPerParent)
  console.timeEnd('initialize steps')

  const childCaminho = from(steps.childGenerator, { maxItemsFlowing: 1_000 })
    .parallel([steps.pipe3, steps.pipe4])
    .reduce(steps.accumulator)

  console.time('initialize caminho')
  const benchmarkCaminho = from(steps.parentGenerator, { maxItemsFlowing: 1_000 })
    .parallel([steps.pipe1, steps.pipe2])
    .pipe({ fn: childCaminho.run.bind(null, {}, ['count']), provides: 'child' })
    .reduce({
      fn: (acc: number, bag: ValueBag): number => acc + bag.child.count,
      seed: 0,
      provides: 'count',
    })
  console.timeEnd('initialize caminho')

  console.time('run caminho')
  const { count: childProcessed } = await benchmarkCaminho.run({}, ['count']) as { count: number }
  console.timeEnd('run caminho')

  if (childProcessed !== expectedTotalChild) {
    throw new Error(`Expected to process ${expectedTotalChild} child items, but processed ${childProcessed}`)
  }
}

function initializeSteps(parentItems: number, childItemsPerParent: number) {
  const accumulatorFn = (acc: number) => acc + 1
  const parentGeneratorFn = getMockedGenerator(getNumberedArray(parentItems))
  const childGeneratorFn = getMockedGenerator(getNumberedArray(childItemsPerParent))
  const pipeFn = async () => 'something'

  return {
    parentGenerator: { fn: parentGeneratorFn, provides: 'source1' },
    childGenerator: { fn: childGeneratorFn, provides: 'subSource1' },
    pipe1: { fn: pipeFn, provides: 'pipe1' },
    pipe2: { fn: pipeFn, provides: 'pipe2' },
    pipe3: { fn: pipeFn, provides: 'pipe3' },
    pipe4: { fn: pipeFn, provides: 'pipe4' },
    accumulator: { fn: accumulatorFn, seed: 0, provides: 'count' },
  }
}

runParallelBenchmark(5_000, 1_000)
