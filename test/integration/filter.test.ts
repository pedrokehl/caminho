import { fromGenerator } from '../../src'
import { getMockedJobGenerator } from '../mocks/generator.mock'

describe('Filter', () => {
  test('Should properly filter values out based on predicate', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .filter((valueBag) => valueBag.job.job_id === '2')
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).toHaveBeenCalledTimes(1)
    expect(saveJob).toHaveBeenCalledWith({ job: { job_id: '2' } })
  })

  test('Should properly filter out all values if predicate return only false', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .filter(() => false)
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).not.toHaveBeenCalled()
  })

  test('Should properly keep all values if predicate return only true', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' })
      .filter(() => true)
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).toHaveBeenCalledTimes(2)
  })

  test('Should properly work with backPressure if values are being filtered out', async () => {
    const generatorMock = getMockedJobGenerator(3)
    const saveJob = jest.fn()

    await fromGenerator({ fn: generatorMock, provides: 'job' }, { maxItemsFlowing: 2 })
      .filter(() => false)
      .pipe({ fn: saveJob })
      .run()

    expect(saveJob).not.toHaveBeenCalled()
  })
})
