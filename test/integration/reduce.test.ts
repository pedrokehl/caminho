import { from } from '../../src'
import { sleep } from '../../src/utils/sleep'
import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getOnStepFinishedParamsFixture } from '../mocks/stepResult.mock'

describe('Reduce', () => {
  test('Should aggregate values provided, and use seed as initial value', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc) => (acc + 1))

    const result = await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 100 })
      .run({}, ['count'])

    expect(result).toEqual({ count: 102 })
  })

  test('Should call aggregator function with correct parameters', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc) => (acc + 1))

    await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 100 })
      .run({ initial: true })

    expect(reduceFn).toBeCalledTimes(2)
    expect(reduceFn).toHaveBeenCalledWith(100, { initial: true, job: { job_id: '1' } }, 0)
    expect(reduceFn).toHaveBeenCalledWith(101, { initial: true, job: { job_id: '2' } }, 1)
  })

  test('Should keep last values processed in reduce to the run output', async () => {
    const generatorMock = getMockedJobGenerator(4)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id)))

    const result = await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 0, keep: ['initial', 'job'] })
      .run({ initial: true }, ['initial', 'job', 'count'])

    expect(result).toEqual({ initial: true, job: { job_id: '4' }, count: 10 })
  })

  test('Allows flow to continue after the reduce execution', async () => {
    const generatorMock = getMockedJobGenerator(4)
    const saveCount = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id)))

    await from({ fn: generatorMock, provides: 'job' })
      .reduce({ fn: reduceFn, provides: 'count', seed: 0, keep: ['initial', 'job'] })
      .pipe({ fn: saveCount })
      .run({ initial: true }, ['initial', 'job', 'count'])

    expect(saveCount).toBeCalledTimes(1)
    expect(saveCount).toBeCalledWith({ initial: true, job: { job_id: '4' }, count: 10 })
  })

  test('Reduce works fine when combined with backpressure', async () => {
    const generatorMock = getMockedJobGenerator(3)
    async function saveJob() {
      await sleep(2)
    }
    const saveCount = jest.fn()
    const onStep = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc, bag) => (acc + Number(bag.job.job_id))).mockName('reduceFn')

    await from({
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
        keep: ['initial', 'job'],
      })
      .pipe({ fn: saveCount, name: 'saveCount' })
      .run({ initial: true }, ['initial', 'job', 'count'])

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
