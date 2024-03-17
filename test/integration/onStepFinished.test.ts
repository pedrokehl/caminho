import { fromGenerator, fromFn } from '../../src'

import { getGeneratorThrowsAfterThYields, getMockedJobGenerator, getThrowingGenerator } from '../mocks/generator.mock'
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

  describe('with error', () => {
    it('forwards the error from .pipe fn to onStepFinished and stops the flow', async () => {
      const error = new Error('fetchError')
      const generatorMock = getMockedJobGenerator(1)
      const fetchMock = jest.fn().mockRejectedValue(error)
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, { onStepFinished })
        .pipe({ name: 'fetchSomething', fn: fetchMock, provides: 'rawData', maxConcurrency: 5 })
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'fetchSomething', error })],
      ])
    })

    it('forwards the error from BATCHED .pipe fn to onStepFinished and stops the flow', async () => {
      const error = new Error('fetchError')
      const generatorMock = getMockedJobGenerator(1)
      const fetchMock = jest.fn().mockRejectedValue(error)
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, { onStepFinished })
        .pipe({ name: 'batchSomething', fn: fetchMock, batch: { maxSize: 1, timeoutMs: 10 } })
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'batchSomething', error })],
      ])
    })

    it('forwards the error from .parallel fn to onStepFinished and stops the flow', async () => {
      const error = new Error('fetchError')
      const generatorMock = getMockedJobGenerator(1)
      const fetchMock = jest.fn().mockRejectedValue(error)
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, { onStepFinished })
        .parallel([{ name: 'batchSomething', fn: fetchMock, batch: { maxSize: 1, timeoutMs: 10 } }])
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'batchSomething', error })],
      ])
    })

    it('forwards the error from .reduce fn to onStepFinished and stops the flow', async () => {
      const error = new Error('reduceError')
      const generatorMock = getMockedJobGenerator(1)
      const reduceMock = jest.fn().mockImplementation(() => { throw error })
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, { onStepFinished })
        .reduce({ name: 'reduceSomething', fn: reduceMock, provides: 'acc', seed: 0 })
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'reduceSomething', error })],
      ])
    })

    it('forwards the error from generator to onStepFinished and stops the flow', async () => {
      const error = new Error('generator error mock')
      const generatorMock = getThrowingGenerator(error)
      const reduceMock = jest.fn()
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, { onStepFinished })
        .reduce({ name: 'reduceSomething', fn: reduceMock, provides: 'acc', seed: 0 })
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator', error })],
      ])
    })

    it('forwards the error from generator to onStepFinished and stops the flow after few yields worked', async () => {
      const error = new Error('generator error mock')
      const generatorMock = getGeneratorThrowsAfterThYields(error, 2)
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'item' }, { onStepFinished })
        .pipe({ fn: saveMock, name: 'saveMock' })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'saveMock' })],
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'saveMock' })],
        [getOnStepFinishedParamsFixture({ name: 'generator', error })],
      ])
    })

    it('forwards the error from .from fn with BACKPRESSURE to onStepFinished and stops the flow', async () => {
      const error = new Error('generator error mock')
      const generatorMock = getThrowingGenerator(error)
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')
      const options = { onStepFinished, maxItemsFlowing: 1 }

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, options)
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator', error })],
      ])
    })

    it('forwards the error from .filter to onStepFinished and stops the flow', async () => {
      const error = new Error('fetchError')
      const generatorMock = getMockedJobGenerator(1)
      const filterFn = jest.fn().mockRejectedValue(error)
      const saveMock = jest.fn()
      const onStepFinished = jest.fn().mockName('onStepFinishedLog')

      const flow = fromGenerator({ name: 'generator', fn: generatorMock, provides: 'job' }, { onStepFinished })
        .pipe({ name: 'filterSomething', fn: filterFn })
        .pipe({ fn: saveMock })

      await expect(flow.run).rejects.toThrow(error)
      expect(onStepFinished.mock.calls).toEqual([
        [getOnStepFinishedParamsFixture({ name: 'generator' })],
        [getOnStepFinishedParamsFixture({ name: 'filterSomething', error })],
      ])
    })
  })
})
