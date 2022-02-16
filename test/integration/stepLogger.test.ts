import { from, OperationType } from '../../src'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { mockStepResult } from '../mocks/stepResult.mock'

test('Should call onEachStep provided callback with proper values', async () => {
  const NUMBER_OF_ITERATIONS = 5

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const fetchMock = function fetchSomething() {}
  const saveMock = function saveSomething() {}
  const onEachStepMock = jest.fn().mockName('onEachStepLog')

  await from({ fn: generatorMock, provides: 'job' }, { onEachStep: onEachStepMock })
    .pipe({ fn: fetchMock, provides: 'rawData', options: { maxConcurrency: 5 } })
    .pipe({ fn: saveMock, options: { batch: { maxSize: 2, timeoutMs: 1 }, maxConcurrency: 5 } })
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    [mockStepResult({ type: OperationType.GENERATE, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.BATCH, name: 'saveSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.BATCH, name: 'saveSomething' })],
    [mockStepResult({ type: OperationType.GENERATE, name: 'generator' })],
    [mockStepResult({ type: OperationType.PIPE, name: 'fetchSomething' })],
    [mockStepResult({ type: OperationType.BATCH, name: 'saveSomething' })],
  ])
})
