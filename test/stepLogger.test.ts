import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { sleep } from './helpers/sleep'

test('Should call onEachStep provided callback with proper values', async () => {
  const NUMBER_OF_ITERATIONS = 5

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const fetchMock = function fetchSomething() {}
  const saveMock = function saveSomething() {}
  const onEachStepMock = jest.fn().mockName('onEachStepLog')

  new Caminho({ onEachStep: onEachStepMock })
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData', options: { concurrency: 5 } })
    .save({ fn: saveMock, options: { batch: { maxSize: 2, timeoutMs: 1 }, concurrency: 5 } })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(onEachStepMock.mock.calls).toEqual([
    [{ name: 'generator', status: 'success', tookMs: expect.any(Number), type: 'generate' }],
    [{ name: 'fetchSomething', status: 'success', tookMs: expect.any(Number), type: 'fetch' }],
    [{ name: 'generator', status: 'success', tookMs: expect.any(Number), type: 'generate' }],
    [{ name: 'fetchSomething', status: 'success', tookMs: expect.any(Number), type: 'fetch' }],
    [{ name: 'saveSomething', status: 'success', tookMs: expect.any(Number), type: 'save' }],
    [{ name: 'generator', status: 'success', tookMs: expect.any(Number), type: 'generate' }],
    [{ name: 'fetchSomething', status: 'success', tookMs: expect.any(Number), type: 'fetch' }],
    [{ name: 'generator', status: 'success', tookMs: expect.any(Number), type: 'generate' }],
    [{ name: 'fetchSomething', status: 'success', tookMs: expect.any(Number), type: 'fetch' }],
    [{ name: 'saveSomething', status: 'success', tookMs: expect.any(Number), type: 'save' }],
    [{ name: 'generator', status: 'success', tookMs: expect.any(Number), type: 'generate' }],
    [{ name: 'fetchSomething', status: 'success', tookMs: expect.any(Number), type: 'fetch' }],
    [{ name: 'saveSomething', status: 'success', tookMs: expect.any(Number), type: 'save' }],
  ])
})
