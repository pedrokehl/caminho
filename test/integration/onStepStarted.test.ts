import { from, fromFn } from '../../src'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepStartedParamsFixture } from '../mocks/stepResult.mock'

describe('onStepStarted', () => {
  it('should call the callback with the proper values', async () => {
    const NUMBER_OF_ITERATIONS = 5

    const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
    const fetchMock = function fetchSomething() {}
    const saveMock = function saveSomething() {}
    const onStepStartedMock = jest.fn().mockName('onStepStartedLog')

    await from({ fn: generatorMock, provides: 'job' }, { onStepStarted: onStepStartedMock })
      .pipe({ fn: fetchMock, provides: 'rawData', maxConcurrency: 5 })
      .pipe({ fn: saveMock, batch: { maxSize: 2, timeoutMs: 1 }, maxConcurrency: 5 })
      .run()

    expect(onStepStartedMock.mock.calls).toEqual([
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'saveSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'saveSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'saveSomething' })],
    ])
  })

  it('should call the callback with the number of values received in batch operation', async () => {
    const onStepStartedMock = jest.fn()
    const fetchSomething = jest.fn().mockName('fetchSomething')

    await from(
      {
        name: 'generator',
        fn: getMockedJobGenerator(2),
        provides: 'job',
      },
      { onStepStarted: onStepStartedMock },
    )
      .pipe({ name: 'batch', fn: fetchSomething, batch: { maxSize: 2, timeoutMs: 100 }, maxConcurrency: 1 })
      .run()

    expect(onStepStartedMock.mock.calls).toEqual([
      [getOnStepStartedParamsFixture({ name: 'generator', received: 1 })],
      [getOnStepStartedParamsFixture({ name: 'generator', received: 1 })],
      [getOnStepStartedParamsFixture({ name: 'batch', received: 2 })],
    ])
  })

  it('should properly handle step.name fallback on "fromFn" ', async () => {
    const onStepStartedMock = jest.fn()
    async function getJob() {
      return { id: '123' }
    }
    await fromFn({ fn: getJob, provides: 'job' }, { onStepStarted: onStepStartedMock }).run()
    expect(onStepStartedMock.mock.calls).toEqual([[getOnStepStartedParamsFixture({ name: 'getJob', received: 1 })]])
  })
})
