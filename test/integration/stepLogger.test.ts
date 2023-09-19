import { from, fromFn } from '../../src'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { mockStepResult } from '../mocks/stepResult.mock'

test('Should call onEachStep provided callback with proper values', async () => {
  const NUMBER_OF_ITERATIONS = 5

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const fetchMock = function fetchSomething() {}
  const saveMock = function saveSomething() {}
  const onEachStepMock = jest.fn().mockName('onEachStepLog')

  await from({ fn: generatorMock, provides: 'job' }, { onEachStep: onEachStepMock })
    .pipe({ fn: fetchMock, provides: 'rawData', maxConcurrency: 5 })
    .pipe({ fn: saveMock, batch: { maxSize: 2, timeoutMs: 1 }, maxConcurrency: 5 })
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    [mockStepResult({ name: 'generator' })],
    [mockStepResult({ name: 'fetchSomething' })],
    [mockStepResult({ name: 'generator' })],
    [mockStepResult({ name: 'fetchSomething' })],
    [mockStepResult({ name: 'saveSomething' })],
    [mockStepResult({ name: 'generator' })],
    [mockStepResult({ name: 'fetchSomething' })],
    [mockStepResult({ name: 'generator' })],
    [mockStepResult({ name: 'fetchSomething' })],
    [mockStepResult({ name: 'saveSomething' })],
    [mockStepResult({ name: 'generator' })],
    [mockStepResult({ name: 'fetchSomething' })],
    [mockStepResult({ name: 'saveSomething' })],
  ])
})

test('Should call onEachStep with the number of values emitted by batch operation', async () => {
  const onEachStepMock = jest.fn()
  const fetchSomething = jest.fn().mockName('fetchSomething')

  await from({ fn: getMockedJobGenerator(2), provides: 'job' }, { onEachStep: onEachStepMock })
    .pipe({ fn: fetchSomething, batch: { maxSize: 2, timeoutMs: 100 }, maxConcurrency: 1 })
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    [mockStepResult({ emitted: 1 })],
    [mockStepResult({ emitted: 1 })],
    [mockStepResult({ emitted: 2 })],
  ])
})

test('Should properly handle step.name fallback on "fromFn" ', async () => {
  const onEachStepMock = jest.fn()
  async function getJob() { return { id: '123' } }
  await fromFn({ fn: getJob, provides: 'job' }, { onEachStep: onEachStepMock }).run()
  expect(onEachStepMock.mock.calls).toEqual([[mockStepResult({ name: 'getJob', emitted: 1 })]])
})
