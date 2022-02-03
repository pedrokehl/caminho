import { Caminho } from '../src/caminho'
import { OperationStatus, OperationType } from '../src/types'
import { getMockedJobGenerator } from './mocks/generator.mock'
import { mockStepResult } from './mocks/stepResult.mock'

test('Should call onEachStep provided callback with proper values', async () => {
  const NUMBER_OF_ITERATIONS = 5

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const fetchMock = function fetchSomething() {}
  const saveMock = function saveSomething() {}
  const onEachStepMock = jest.fn().mockName('onEachStepLog')

  await new Caminho({ onEachStep: onEachStepMock })
    .source({ fn: generatorMock, provides: 'job' })
    .pipe({ fn: fetchMock, provides: 'rawData', options: { concurrency: 5 } })
    .pipe({ fn: saveMock, options: { batch: { maxSize: 2, timeoutMs: 1 }, concurrency: 5 } })
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    [mockStepResult({ type: OperationType.GENERATE, status: OperationStatus.SUCCESS, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, status: OperationStatus.SUCCESS, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, status: OperationStatus.SUCCESS, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, status: OperationStatus.SUCCESS, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.BATCH, status: OperationStatus.SUCCESS, name: 'saveSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, status: OperationStatus.SUCCESS, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, status: OperationStatus.SUCCESS, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, status: OperationStatus.SUCCESS, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, status: OperationStatus.SUCCESS, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.BATCH, status: OperationStatus.SUCCESS, name: 'saveSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, status: OperationStatus.SUCCESS, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, status: OperationStatus.SUCCESS, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.BATCH, status: OperationStatus.SUCCESS, name: 'saveSomething' })],
  ])
})
