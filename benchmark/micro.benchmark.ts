import { writeFileSync } from 'node:fs'
import { Bench } from 'tinybench'
import { fromArray, fromGenerator, type ValueBag } from '../src'
import { getNumberedArray } from '../test/mocks/array.mock'
import { getMockedGenerator } from '../test/mocks/generator.mock'

const ITEMS = getNumberedArray(10_000)

function pipeFlow() {
  return fromArray({ items: ITEMS, provides: 'n' })
    .pipe({ fn: () => 1, provides: 'a' })
    .pipe({ fn: () => 2, provides: 'b' })
    .pipe({ fn: () => 3 })
    .run()
}

function pipeFlowWithLoggers() {
  const noop = () => {}
  return fromArray({ items: ITEMS, provides: 'n' }, { onStepStarted: noop, onStepFinished: noop })
    .pipe({ fn: () => 1, provides: 'a' })
    .pipe({ fn: () => 2, provides: 'b' })
    .pipe({ fn: () => 3 })
    .run()
}

function batchFlow() {
  return fromArray({ items: ITEMS, provides: 'n' })
    .pipe({ fn: (bags: ValueBag[]) => bags.map(() => 1), provides: 'a', batch: { maxSize: 50, timeoutMs: 10 } })
    .pipe({ fn: () => 2 })
    .run()
}

function parallelFlow() {
  return fromArray({ items: ITEMS, provides: 'n' })
    .parallel([
      { fn: async () => 1, provides: 'a' },
      { fn: async () => 2, provides: 'b' },
    ])
    .pipe({ fn: () => 3 })
    .run()
}

function backpressureFlow() {
  return fromGenerator({ fn: getMockedGenerator(ITEMS), provides: 'n' }, { maxItemsFlowing: 100 })
    .pipe({ fn: async () => 1, provides: 'a' })
    .pipe({ fn: () => 2 })
    .run()
}

function reduceFlow() {
  return fromArray({ items: ITEMS, provides: 'n' })
    .pipe({ fn: () => 1, provides: 'a' })
    .reduce({ fn: (acc: number, bag: ValueBag) => acc + bag.a, seed: 0, provides: 'sum' })
    .run()
}

const PARENT_ITEMS = getNumberedArray(500)
const CHILD_ITEMS = getNumberedArray(20)

function nestedFlow() {
  const childCaminho = fromArray({ items: CHILD_ITEMS, provides: 'childItem' })
    .reduce({ fn: (acc: number) => acc + 1, seed: 0, provides: 'count' })

  return fromArray({ items: PARENT_ITEMS, provides: 'parent' })
    .pipe({ fn: childCaminho.run, provides: 'child' })
    .reduce({ fn: (acc: number, bag: ValueBag) => acc + bag.child.count, seed: 0, provides: 'total' })
    .run()
}

const MANY_ITEMS = getNumberedArray(200_000)

type SampleFn = () => void

function slowConsumerFlow(sample: SampleFn) {
  return fromArray({ items: MANY_ITEMS, provides: 'n' })
    .pipe({ fn: async () => 1, maxConcurrency: 500, provides: 'a' })
    .pipe({ fn: sample })
    .run()
}

function slowConsumerFlowWithBackpressure(sample: SampleFn) {
  return fromGenerator({ fn: getMockedGenerator(MANY_ITEMS), provides: 'n' }, { maxItemsFlowing: 1_000 })
    .pipe({ fn: async () => 1, maxConcurrency: 500, provides: 'a' })
    .pipe({ fn: sample })
    .run()
}

// These flows are one long microtask chain, so timer-based sampling would starve;
// memory is sampled from inside the pipeline instead.
async function measurePeakHeap(flow: (sample: SampleFn) => Promise<ValueBag>): Promise<number> {
  const baseline = process.memoryUsage().heapUsed
  let peak = 0
  let counter = 0
  const sample = () => {
    counter += 1
    if (counter % 500 === 0) {
      peak = Math.max(peak, process.memoryUsage().heapUsed - baseline)
    }
  }
  await flow(sample)
  return peak
}

type BenchmarkEntry = { name: string, unit: string, value: number }

async function main() {
  const bench = new Bench({ time: 1_000 })

  bench.add('pipe: 10k items, 3 sync steps', pipeFlow)
  bench.add('pipe with onStep loggers: 10k items, 3 sync steps', pipeFlowWithLoggers)
  bench.add('batch: 10k items, maxSize 50', batchFlow)
  bench.add('parallel: 10k items, 2 branches', parallelFlow)
  bench.add('backpressure: 10k items, maxItemsFlowing 100', backpressureFlow)
  bench.add('reduce: 10k items', reduceFlow)
  bench.add('nested flows: 500 parents x 20 children', nestedFlow)

  await bench.run()
  console.table(bench.table())

  const results: BenchmarkEntry[] = bench.tasks.map((task) => ({
    name: task.name,
    unit: 'ops/sec',
    value: Number((task.result?.throughput.mean ?? 0).toFixed(3)),
  }))

  console.log('\n---- Peak heap usage (approximate, informational only) ----')
  for (const [name, flow] of [
    ['200k items, async step at concurrency 500, no backpressure', slowConsumerFlow],
    ['200k items, async step at concurrency 500, maxItemsFlowing 1k', slowConsumerFlowWithBackpressure],
  ] as const) {
    const peakBytes = await measurePeakHeap(flow)
    const peakMb = Number((peakBytes / 1024 / 1024).toFixed(2))
    console.log(`${name}: ~${peakMb} MB over baseline`)
  }

  // only ops/sec entries: github-action-benchmark needs a single direction (biggerIsBetter)
  const outputPath = process.env.BENCHMARK_OUTPUT
  if (outputPath) {
    writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\nResults written to ${outputPath}`)
  }
}

main()
