import { Caminho } from '../src/caminho'
import { sleep } from '../src/helpers/sleep'
import { OperationType, ValueBag } from '../src/types'
import { getMockedJobGenerator } from './mocks/generator.mock'
import { mockStepResult } from './mocks/stepResult.mock'

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

  const fetchStatus = { fn: fetchStatusFn, provides: 'status', options: { batch: { maxSize: 3, timeoutMs: 15 } } }
  const fetchPosition = { fn: fetchPositionFn, provides: 'position', concurrency: 5 }
  const saveAll = { fn: saveAllFn }

  await new Caminho()
    .source({ fn: getMockedJobGenerator(10), provides: 'job' })
    .parallel([fetchStatus, fetchPosition])
    .pipe(saveAll)
    .run()

  const firstParamCalls = saveAllFn.mock.calls.map((params) => params[0])

  expect(firstParamCalls).toMatchObject([
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

test('Parallel steps should use the most efficient path for emiting values', async () => {
  const NUMBER_OF_ITERATIONS = 5

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const onEachStepMock = jest.fn().mockName('onEachStepLog')

  const fetchStatus = {
    fn: async function fetchStatus(valueBag: ValueBag[]) {
      await sleep(10)
      return valueBag.map(() => 'ok')
    },
    provides: 'status',
    options: { batch: { maxSize: 3, timeoutMs: 15 } },
  }
  const fetchPosition = {
    fn: async function fetchPosition() {
      await sleep(5)
      return 'SW'
    },
    provides: 'position',
    concurrency: 5,
  }
  const saveAll = {
    fn: async function saveSomething() {
      await sleep(1)
    },
  }

  await new Caminho({ onEachStep: onEachStepMock })
    .source({ fn: generatorMock, provides: 'job', maxItemsFlowing: 2 })
    .parallel([fetchStatus, fetchPosition])
    .pipe(saveAll)
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    [mockStepResult({ name: 'generator', type: OperationType.GENERATE })],
    [mockStepResult({ name: 'generator', type: OperationType.GENERATE })],
    [mockStepResult({ name: 'fetchPosition', type: OperationType.PIPE })],
    [mockStepResult({ name: 'fetchPosition', type: OperationType.PIPE })],
    [mockStepResult({ name: 'fetchStatus', type: OperationType.BATCH })],
    [mockStepResult({ name: 'saveSomething', type: OperationType.PIPE })],
    [mockStepResult({ name: 'saveSomething', type: OperationType.PIPE })],
    [mockStepResult({ name: 'generator', type: OperationType.GENERATE })],
    [mockStepResult({ name: 'generator', type: OperationType.GENERATE })],
    [mockStepResult({ name: 'fetchPosition', type: OperationType.PIPE })],
    [mockStepResult({ name: 'fetchPosition', type: OperationType.PIPE })],
    [mockStepResult({ name: 'fetchStatus', type: OperationType.BATCH })],
    [mockStepResult({ name: 'saveSomething', type: OperationType.PIPE })],
    [mockStepResult({ name: 'saveSomething', type: OperationType.PIPE })],
    [mockStepResult({ name: 'generator', type: OperationType.GENERATE })],
    [mockStepResult({ name: 'fetchPosition', type: OperationType.PIPE })],
    [mockStepResult({ name: 'fetchStatus', type: OperationType.BATCH })],
    [mockStepResult({ name: 'saveSomething', type: OperationType.PIPE })],
  ])
})
