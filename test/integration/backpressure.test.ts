import { fromGenerator } from '../../src'
import { getMockedJobGenerator } from '../mocks/generator.mock'
import { type Job } from '../mocks/job.mock'

describe('Backpressure', () => {
  test('Should finish with number of items flowing as 0 with pipe operators', async () => {
    const generatorMock = getMockedJobGenerator(10)
    const saveJob = jest.fn()
    const saveFn = jest.fn()

    const caminho = fromGenerator({ fn: generatorMock, provides: 'job' }, { maxItemsFlowing: 2 })
      .pipe({ fn: saveJob })
      .pipe({ fn: saveFn })

    await caminho.run()

    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })

  test('Should finish with number of items flowing as 0 with a reduce operator', async () => {
    const generatorMock = getMockedJobGenerator(10)
    const saveJob = jest.fn()
    const reduceFn = jest.fn().mockImplementation((acc) => acc + 1)
    const saveFn = jest.fn()

    const caminho = fromGenerator({ fn: generatorMock, provides: 'job' }, { maxItemsFlowing: 2 })
      .pipe({ fn: saveJob })
      .reduce({ fn: reduceFn, provides: 'count', seed: 100 })
      .pipe({ fn: saveFn })

    await caminho.run()

    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })

  test('Should finish with number of items flowing as 0 with filtering only part of the records', async () => {
    const generatorMock = getMockedJobGenerator(10)
    const saveJob = jest.fn()
    const saveFn = jest.fn()

    const caminho = fromGenerator({ fn: generatorMock, provides: 'job' }, { maxItemsFlowing: 2 })
      .pipe({ fn: saveJob })
      .filter({ fn: ({ job }: { job: Job }) => Number(job.job_id) % 2 === 0 })
      .pipe({ fn: saveFn })

    await caminho.run()

    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })

  test('Should finish with number of items flowing as 0 with filtering all records', async () => {
    const generatorMock = getMockedJobGenerator(10)
    const saveJob = jest.fn()
    const saveFn = jest.fn()

    const caminho = fromGenerator({ fn: generatorMock, provides: 'job' }, { maxItemsFlowing: 2 })
      .pipe({ fn: saveJob })
      .filter({ fn: () => true })
      .pipe({ fn: saveFn })

    await caminho.run()

    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })
})
