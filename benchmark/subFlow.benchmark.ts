import { Caminho } from '../src/caminho'
import { sleep } from '../src/utils/sleep'
import { getNumberedArray } from '../test/mocks/array.mock'
import { getMockedGenerator } from '../test/mocks/generator.mock'

async function runSubflowBenchmark(parentItems: number, childItemsPerParent: number) {
  console.log(`Initialized with ${parentItems} parent items, and ${parentItems * childItemsPerParent} child items.`)
  await sleep(100)
  console.time('initialize steps')
  const steps = initializeSteps(parentItems, childItemsPerParent)

  const batchStep = {
    fn: steps.getBatchSleeper(50),
    provides: 'batch1',
    options: { batch: { maxSize: 50, timeoutMs: 5 } },
  }

  console.timeEnd('initialize steps')
  console.time('initialize caminho')

  const benchmarkCaminho = new Caminho()
    .source({ fn: steps.parentGenerator, maxItemsFlowing: 1_000, provides: 'source1' })
    .pipe({ fn: steps.sleeper, provides: 'pipe1' })
    .subFlow((caminho) => caminho
      .source({ fn: steps.childGenerator, maxItemsFlowing: 1_000, provides: 'subSource1' })
      .pipe(batchStep), steps.accumulator)
    .pipe({ fn: steps.sleeper, provides: 'pipe2' })

  console.timeEnd('initialize caminho')
  console.time('run caminho')
  await benchmarkCaminho.run()
  console.timeEnd('run caminho')
}

function initializeSteps(parentItems: number, childItemsPerParent: number) {
  const accumulator = { fn: (acc: number) => acc + 1, seed: 0, provides: 'accumulator1' }

  return {
    parentGenerator: getMockedGenerator(getNumberedArray(parentItems)),
    childGenerator: getMockedGenerator(getNumberedArray(childItemsPerParent)),
    sleeper: async () => 'something',
    accumulator,
    getBatchSleeper(size: number) {
      const array = getNumberedArray(size)
      return function batchSleeper() {
        return array
      }
    },
  }
}

runSubflowBenchmark(5_0000, 1000)
