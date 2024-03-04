import { from } from '../../src'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepFinishedParamsFixture, getOnStepStartedParamsFixture } from '../mocks/stepResult.mock'

describe('onStepStarted / onStepFinished', () => {
  it('should call the onStepStarted + onStepFinished callback with the proper values', async () => {
    const NUMBER_OF_ITERATIONS = 5

    const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
    const fetchMock = function fetchSomething() {}
    const saveMock = function saveSomething() {}
    const onStep = jest.fn().mockName('onStep')

    await from({ fn: generatorMock, provides: 'job' }, { onStepStarted: onStep, onStepFinished: onStep })
      .pipe({ fn: fetchMock, provides: 'rawData', maxConcurrency: 5 })
      .pipe({ fn: saveMock, batch: { maxSize: 2, timeoutMs: 1 }, maxConcurrency: 5 })
      .run()

    expect(onStep.mock.calls).toEqual([
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'saveSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'saveSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchSomething' })],
      [getOnStepStartedParamsFixture({ name: 'saveSomething' })],
      [getOnStepFinishedParamsFixture({ name: 'saveSomething' })],
    ])
  })
})
