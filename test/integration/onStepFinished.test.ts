import { fromGenerator, fromFn } from '../../src'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepFinishedParamsFixture } from '../mocks/stepResult.mock'

describe('onStepFinished', () => {
  it('should call the onStepFinished callback with the proper values', async () => {
    const NUMBER_OF_ITERATIONS = 5

    const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
    const fetchMock = function fetchSomething() {}
    const saveMock = function saveSomething() {}
    const onStepFinishedMock = jest.fn().mockName('onStepFinishedLog')

    await fromGenerator({ fn: generatorMock, provides: 'job' }, { onStepFinished: onStepFinishedMock })
      .pipe({ fn: fetchMock, provides: 'rawData', maxConcurrency: 5 })
      .pipe({ fn: saveMock, batch: { maxSize: 2, timeoutMs: 1 }, maxConcurrency: 5 })
      .run()

    expect(onStepFinishedMock.mock.calls).toEqual([
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
    ])
  })

  it('should call the onStepFinished callback with the number of values emitted by batch operation', async () => {
    const onStepFinishedMock = jest.fn()
    const fetchSomething = jest.fn().mockName('fetchSomething')

    await fromGenerator({ fn: getMockedJobGenerator(2), provides: 'job' }, { onStepFinished: onStepFinishedMock })
      .pipe({ name: 'fetchSomething', fn: fetchSomething, batch: { maxSize: 2, timeoutMs: 100 }, maxConcurrency: 1 })
      .run()

    expect(onStepFinishedMock.mock.calls).toEqual([
      [getOnStepFinishedParamsFixture({ name: 'generator', emitted: 1 })],
      [getOnStepFinishedParamsFixture({ name: 'generator', emitted: 1 })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething', emitted: 2 })],
    ])
  })

  it('should properly handle step.name fallback on "fromFn" ', async () => {
    const onStepFinishedMock = jest.fn()
    async function getJob() {
      return { id: '123' }
    }
    await fromFn({ fn: getJob, provides: 'job' }, { onStepFinished: onStepFinishedMock }).run()
    expect(onStepFinishedMock.mock.calls).toEqual([[getOnStepFinishedParamsFixture({ name: 'getJob', emitted: 1 })]])
  })
})
