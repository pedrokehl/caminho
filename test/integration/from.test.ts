import { from } from '../../src'
import { sleep } from '../../src/utils/sleep'

import { getMockedJobGenerator } from '../mocks/generator.mock'
import { mockStepResult } from '../mocks/stepResult.mock'

describe('from', () => {
  test('Should call generator and run all function provided to the flow', async () => {
    const mapMock = jest.fn()
    const fetchMock = jest.fn()
    const NUMBER_OF_ITERATIONS = 50

    const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)

    await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .pipe({ fn: mapMock, provides: 'mappedData' })
      .run()

    expect(fetchMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
    expect(mapMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
  })

  test('Should not emit more than maxItemsFlowing value concurrently', async () => {
    const options = { onEachStep: jest.fn(), maxItemsFlowing: 3 }
    const NUMBER_OF_ITERATIONS = 7

    const generatorStep = { fn: getMockedJobGenerator(NUMBER_OF_ITERATIONS), provides: 'job', name: 'generator' }

    await from(generatorStep, options)
      .pipe({ fn: function fetchMock() { return sleep(10) }, provides: 'rawData', maxConcurrency: 1 })
      .run()

    expect(options.onEachStep.mock.calls).toEqual([
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
    ])
  })

  test('Should emit values from generator uncontrolably if maxItemsFlowing was not provided', async () => {
    const options = { onEachStep: jest.fn() }
    const NUMBER_OF_ITERATIONS = 7

    await from({ fn: getMockedJobGenerator(NUMBER_OF_ITERATIONS), provides: 'job', name: 'generator' }, options)
      .pipe({ fn: function fetchMock() { return sleep(10) }, provides: 'rawData' })
      .run()

    expect(options.onEachStep.mock.calls).toEqual([
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'generator' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
      [mockStepResult({ name: 'fetchMock' })],
    ])
  })
})
