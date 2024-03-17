import { type CaminhoOptions, fromGenerator } from '../../src'
import { getMockedJobGenerator } from '../mocks/generator.mock'
import type { Job } from '../mocks/job.mock'
import { getOnStepFinishedParamsFixture, getOnStepStartedParamsFixture } from '../mocks/stepResult.mock'

describe('Filter', () => {
  test('Should properly filter values out based on predicate', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .filter({ fn: (valueBag) => valueBag.job.job_id === '2' })
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).toHaveBeenCalledTimes(1)
    expect(saveJob).toHaveBeenCalledWith({ job: { job_id: '2' } })
  })

  test('Should properly filter out all values if predicate return only false', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .filter({ fn: () => false })
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).not.toHaveBeenCalled()
  })

  test('Should properly keep all values if predicate return only true', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .filter({ fn: () => true })
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).toHaveBeenCalledTimes(2)
  })

  test('Should properly work with backPressure if values are being filtered out', async () => {
    const generatorMock = getMockedJobGenerator(3)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' }, { maxItemsFlowing: 2 })
      .filter({ fn: () => false })
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).not.toHaveBeenCalled()
  })

  test('Should call onStepStarted and onStepFinished properly', async () => {
    const generatorMock = getMockedJobGenerator(5)
    const saveJob = jest.fn()
    const onStep = jest.fn()
    const options: CaminhoOptions = {
      maxItemsFlowing: 2,
      onStepStarted: onStep,
      onStepFinished: onStep,
    }

    const filterFn = ({ job } : { job: Job }) => Number(job.job_id) % 2 === 0

    await fromGenerator({ fn: generatorMock, provides: 'job', name: 'generator' }, options)
      .filter({ fn: filterFn, name: 'filterEven' })
      .pipe({ fn: saveJob, name: 'saveJob' })
      .run()

    expect(onStep.mock.calls).toEqual([
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'filterEven' })],
      [getOnStepFinishedParamsFixture({ name: 'filterEven' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'filterEven' })],
      [getOnStepFinishedParamsFixture({ name: 'filterEven' })],
      [getOnStepStartedParamsFixture({ name: 'saveJob' })],
      [getOnStepFinishedParamsFixture({ name: 'saveJob' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'filterEven' })],
      [getOnStepFinishedParamsFixture({ name: 'filterEven' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'filterEven' })],
      [getOnStepFinishedParamsFixture({ name: 'filterEven' })],
      [getOnStepStartedParamsFixture({ name: 'saveJob' })],
      [getOnStepFinishedParamsFixture({ name: 'saveJob' })],
      [getOnStepStartedParamsFixture({ name: 'generator' })],
      [getOnStepFinishedParamsFixture({ name: 'generator' })],
      [getOnStepStartedParamsFixture({ name: 'filterEven' })],
      [getOnStepFinishedParamsFixture({ name: 'filterEven' })],
    ])
  })
})
