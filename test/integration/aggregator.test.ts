import { from } from '../../src'
import { getMockedJobGenerator } from '../mocks/generator.mock'

describe('Aggregator', () => {
  test('Should aggregate values provided, and use seed as initial value', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()
    const accumulatorFn = jest.fn().mockImplementation((acc) => (acc + 1))

    const result = await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .run({}, { fn: accumulatorFn, seed: 100 })

    expect(result).toBe(102)
  })

  test('Should call aggregator function with correct parameters', async () => {
    const generatorMock = getMockedJobGenerator(2)
    const saveJob = jest.fn()
    const accumulatorFn = jest.fn().mockImplementation((acc) => (acc + 1))

    await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: saveJob })
      .run({ initial: true }, { fn: accumulatorFn, seed: 100 })

    expect(accumulatorFn).toBeCalledTimes(2)
    expect(accumulatorFn).toHaveBeenCalledWith(100, { initial: true, job: { job_id: '1' } }, 0)
    expect(accumulatorFn).toHaveBeenCalledWith(101, { initial: true, job: { job_id: '2' } }, 1)
  })
})
