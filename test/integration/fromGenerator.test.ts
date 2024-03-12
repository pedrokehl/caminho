import { CaminhoOptions, fromGenerator } from '../../src'
import { sleep } from '../../src/utils/sleep'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepFinishedParamsFixture } from '../mocks/stepResult.mock'

describe('fromGenerator', () => {
  test('Should call generator and run all function provided to the flow', async () => {
    const mapMock = jest.fn()
    const fetchMock = jest.fn()
    const NUMBER_OF_ITERATIONS = 50

    const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .pipe({ fn: mapMock, provides: 'mappedData' })
      .run()

    expect(fetchMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS)
    expect(mapMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS)
  })

  test('Should not emit more than maxItemsFlowing value concurrently', async () => {
    const options: CaminhoOptions = { onStepFinished: jest.fn(), maxItemsFlowing: 3 }
    const NUMBER_OF_ITERATIONS = 7

    const generatorStep = { fn: getMockedJobGenerator(NUMBER_OF_ITERATIONS), provides: 'job', name: 'generator' }

    await fromGenerator(generatorStep, options)
      .pipe({ fn: function fetchMock() { return sleep(10) }, provides: 'rawData', maxConcurrency: 1 })
      .run()

    expect((options.onStepFinished as jest.Mock).mock.calls).toEqual([
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
    ])
  })

  test('Should emit values from generator uncontrolably if maxItemsFlowing was not provided', async () => {
    const options: CaminhoOptions = { onStepFinished: jest.fn() }
    const NUMBER_OF_ITERATIONS = 7
    const generatorOptions = { fn: getMockedJobGenerator(NUMBER_OF_ITERATIONS), provides: 'job', name: 'generator' }

    await fromGenerator(generatorOptions, options)
      .pipe({ fn: function fetchMock() { return sleep(10) }, provides: 'rawData' })
      .run()

    expect((options.onStepFinished as jest.Mock).mock.calls).toEqual([
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
      [getOnStepFinishedParamsFixture({ name: 'fetchMock' })],
    ])
  })
})
