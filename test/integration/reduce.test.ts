import { fromGenerator } from '../../src'
import { sleep } from '../../src/utils/sleep'
import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepFinishedParamsFixture } from '../mocks/stepResult.mock'

describe('Reduce', () => {
  test('Should aggregate values provided, and use seed as initial value', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc) => (acc + 1))
    const saveFn = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 100 })
      .pipe({ fn: saveFn })
      .run()

    expect(saveFn).toHaveBeenCalledWith({ count: 102 })
  })

  test('Should call aggregator function with correct parameters', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc) => (acc + 1))

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 100 })
      .run({ initial: true })

    expect(reduceFn).toBeCalledTimes(2)
    expect(reduceFn).toHaveBeenCalledWith(100, { initial: true, job: { job_id: '1' } }, 0)
    expect(reduceFn).toHaveBeenCalledWith(101, { initial: true, job: { job_id: '2' } }, 1)
  })

  test('Should keep only the reduce value by default (keep not defined)', async () => {
    const generatorMock = getMockedJobGenerator(4)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id)))

    const result = await fromGenerator({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 0 })
      .run({ initial: true })

    expect(result).toEqual({ count: 10 })
  })

  test('Should keep the reduce value and the properties passed to "keep"', async () => {
    const generatorMock = getMockedJobGenerator(4)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id)))

    const result = await fromGenerator({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 0, keep: ['initial'] })
      .run({ initial: true })

    expect(result).toEqual({ count: 10, initial: true })
  })

  test('Allows flow to continue after the reduce execution', async () => {
    const generatorMock = getMockedJobGenerator(4)
    const saveCount = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id)))

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .reduce({ fn: reduceFn, provides: 'count', seed: 0 })
      .pipe({ fn: saveCount })
      .run({ initial: true })

    expect(saveCount).toBeCalledTimes(1)
    expect(saveCount).toBeCalledWith({ count: 10 })
  })

  test('Reduce works fine when combined with backpressure', async () => {
    const generatorMock = getMockedJobGenerator(3)
    async function saveJob() {
      await sleep(2)
    }
    const saveCount = jest.fn()
    const onStep = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id))).mockName('reduceFn')

    await fromGenerator({
      name: 'generator',
      fn: generatorMock,
      provides: 'job',
    }, { maxItemsFlowing: 1, onStepFinished: onStep })
      .pipe({ fn: saveJob, name: 'saveJob' })
      .reduce({
        name: 'reduce',
        fn: reduceFn,
        provides: 'count',
        seed: 0,
      })
      .pipe({ fn: saveCount, name: 'saveCount' })
      .run()

    expect(onStep.mock.calls).toEqual([
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'saveJob' })],
      [getOnStepFinishedParamsFixture({ name: 'reduce' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'saveJob' })],
      [getOnStepFinishedParamsFixture({ name: 'reduce' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'saveJob' })],
      [getOnStepFinishedParamsFixture({ name: 'reduce' })],

      [getOnStepFinishedParamsFixture({ name: 'saveCount' })],
    ])
  })
})
