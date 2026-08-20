import { fromGenerator, type ValueBag } from '../../src'
import { sleep } from '../../src/utils/sleep'

import { getMockedGenerator, getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepFinishedParamsFixture } from '../mocks/stepResult.mock'

test('Parallel steps should provide valueBag properly to the following steps', async () => {
  async function fetchStatusFn(valueBags: ValueBag[]) {
    await sleep(10)
    return valueBags.map((valueBag) => {
      const idNumber = Number(valueBag.job.job_id)
      return `${idNumber} is ${idNumber % 3 === 0 ? 'fired' : 'ok'}`
    })
  }

  async function fetchPositionFn(valueBag: ValueBag) {
    await sleep(5)
    return Number(valueBag.job.job_id) % 5 === 0 ? 'HR' : 'SW'
  }

  const saveAllFn = jest.fn().mockName('save')

  const fetchStatus = { fn: fetchStatusFn, provides: 'status', batch: { maxSize: 3, timeoutMs: 15 } }
  const fetchPosition = { fn: fetchPositionFn, provides: 'position', maxConcurrency: 5 }
  const saveAll = { fn: saveAllFn }

  await fromGenerator({ fn: getMockedJobGenerator(10), provides: 'job' })
    .parallel([fetchStatus, fetchPosition])
    .pipe(saveAll)
    .run()

  const firstParamCalls = saveAllFn.mock.calls.map((params) => params[0])

  expect(firstParamCalls).toEqual([
    { job: { job_id: '1' }, status: '1 is ok', position: 'SW' },
    { job: { job_id: '2' }, status: '2 is ok', position: 'SW' },
    { job: { job_id: '3' }, status: '3 is fired', position: 'SW' },
    { job: { job_id: '4' }, status: '4 is ok', position: 'SW' },
    { job: { job_id: '5' }, status: '5 is ok', position: 'HR' },
    { job: { job_id: '6' }, status: '6 is fired', position: 'SW' },
    { job: { job_id: '7' }, status: '7 is ok', position: 'SW' },
    { job: { job_id: '8' }, status: '8 is ok', position: 'SW' },
    { job: { job_id: '9' }, status: '9 is fired', position: 'SW' },
    { job: { job_id: '10' }, status: '10 is ok', position: 'HR' },
  ])
})

test('Parallel steps with variable latency should not mix values across items', async () => {
  const results: ValueBag[] = []

  // Branch A is fastest for the last item, branch B is fastest for the first item,
  // so the branches emit in opposite orders when concurrency is unlimited.
  const slowsDown = {
    fn: async ({ id }: { id: number }) => {
      await sleep((6 - id) * 20)
      return `A${id}`
    },
    provides: 'a',
  }
  const speedsUp = {
    fn: async ({ id }: { id: number }) => {
      await sleep(id * 5)
      return `B${id}`
    },
    provides: 'b',
  }

  await fromGenerator({ fn: getMockedGenerator([1, 2, 3, 4, 5]), provides: 'id' })
    .parallel([slowsDown, speedsUp])
    .pipe({ fn: (valueBag: ValueBag) => { results.push(valueBag) } })
    .run()

  expect(results).toHaveLength(5)
  for (const valueBag of results) {
    expect(valueBag).toEqual({ id: valueBag.id, a: `A${valueBag.id}`, b: `B${valueBag.id}` })
  }
})

test('Parallel batch steps with variable latency should not mix values across items', async () => {
  const results: ValueBag[] = []

  // maxSize 1 makes every batch complete independently, with per-item latency
  const slowsDownBatch = {
    fn: async (valueBags: ValueBag[]) => {
      await sleep((6 - valueBags[0].id) * 20)
      return valueBags.map(({ id }) => `A${id}`)
    },
    provides: 'a',
    batch: { maxSize: 1, timeoutMs: 1 },
  }
  const speedsUp = {
    fn: async ({ id }: { id: number }) => {
      await sleep(id * 5)
      return `B${id}`
    },
    provides: 'b',
  }

  await fromGenerator({ fn: getMockedGenerator([1, 2, 3, 4, 5]), provides: 'id' })
    .parallel([slowsDownBatch, speedsUp])
    .pipe({ fn: (valueBag: ValueBag) => { results.push(valueBag) } })
    .run()

  expect(results).toHaveLength(5)
  for (const valueBag of results) {
    expect(valueBag).toEqual({ id: valueBag.id, a: `A${valueBag.id}`, b: `B${valueBag.id}` })
  }
})

test('Parallel steps mixing non-providing and providing steps should read values from the correct branch', async () => {
  const results: ValueBag[] = []
  const sideEffect = jest.fn().mockName('sideEffect')

  await fromGenerator({ fn: getMockedGenerator([1, 2, 3]), provides: 'id' })
    .parallel([
      { fn: sideEffect },
      { fn: ({ id }: { id: number }) => `B${id}`, provides: 'b' },
    ])
    .pipe({ fn: (valueBag: ValueBag) => { results.push(valueBag) } })
    .run()

  expect(sideEffect).toHaveBeenCalledTimes(3)
  expect(results).toEqual([
    { id: 1, b: 'B1' },
    { id: 2, b: 'B2' },
    { id: 3, b: 'B3' },
  ])
})

test('Parallel steps should use the most efficient path for emiting values', async () => {
  const NUMBER_OF_ITERATIONS = 5

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const onStepFinished = jest.fn().mockName('onStepFinishedLog')

  const fetchStatus = {
    fn: async function fetchStatus(valueBag: ValueBag[]) {
      await sleep(10)
      return valueBag.map(() => 'ok')
    },
    provides: 'status',
    batch: { maxSize: 3, timeoutMs: 15 },
  }
  const fetchPosition = {
    fn: async function fetchPosition() {
      await sleep(5)
      return 'SW'
    },
    provides: 'position',
    maxConcurrency: 5,
  }
  const saveAll = {
    fn: async function saveSomething() {
      await sleep(1)
    },
  }

  await fromGenerator({ fn: generatorMock, provides: 'job' }, { onStepFinished, maxItemsFlowing: 2 })
    .parallel([fetchStatus, fetchPosition])
    .pipe(saveAll)
    .run()

  expect(onStepFinished.mock.calls).toEqual([
    [getOnStepFinishedParamsFixture({ name: 'generator' })],
    [getOnStepFinishedParamsFixture({ name: 'generator' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchPosition' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchPosition' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchStatus' })],
    [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
    [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
    [getOnStepFinishedParamsFixture({ name: 'generator' })],
    [getOnStepFinishedParamsFixture({ name: 'generator' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchPosition' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchPosition' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchStatus' })],
    [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
    [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
    [getOnStepFinishedParamsFixture({ name: 'generator' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchPosition' })],
    [getOnStepFinishedParamsFixture({ name: 'fetchStatus' })],
    [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
  ])
})
