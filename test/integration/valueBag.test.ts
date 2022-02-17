/* eslint-disable no-param-reassign */
import { from, ValueBag } from '../../src'
import { getMockedJobGenerator } from '../mocks/generator.mock'
import { getMockedJob } from '../mocks/job.mock'

describe('ValueBag', () => {
  test('Should provide valueBag properly to the flow', async () => {
    const mockedJob = getMockedJob(0)
    const mockedData = { message: 'This is a cool message' }

    const fetchMock = jest.fn().mockName('fetch').mockResolvedValue(mockedData)
    const mapMock = jest.fn().mockName('map').mockReturnValue(mockedData.message)
    const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

    const generatorMock = getMockedJobGenerator(1)

    await from({ fn: generatorMock, provides: 'job' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .pipe({ fn: mapMock, provides: 'mappedData' })
      .pipe({ fn: saveMock })
      .run()

    expect(fetchMock.mock.calls[0][0]).toEqual({ job: mockedJob })
    expect(mapMock.mock.calls[0][0]).toEqual({ job: mockedJob, rawData: mockedData })
    expect(saveMock.mock.calls[0][0]).toEqual({
      job: mockedJob,
      rawData: mockedData,
      mappedData: mockedData.message,
    })
  })

  test('Should not be able to mutate valueBag from a step function', async () => {
    function mutateValueBag(valueBag: ValueBag) {
      valueBag.job = 'mutated'
    }
    const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

    await from({ fn: getMockedJobGenerator(1), provides: 'job' })
      .pipe({ fn: mutateValueBag })
      .pipe({ fn: saveMock })
      .run()

    expect(saveMock.mock.calls[0][0]).toEqual({ job: getMockedJob(0) })
  })

  test('Should not be able to mutate valueBag from a step batch function', async () => {
    function mutateValueBag(valueBag: ValueBag[]) {
      valueBag[0] = {}
    }
    const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

    await from({ fn: getMockedJobGenerator(1), provides: 'job' })
      .pipe({ fn: mutateValueBag, batch: { maxSize: 1, timeoutMs: 1 } })
      .pipe({ fn: saveMock })
      .run()

    expect(saveMock.mock.calls[0][0]).toEqual({ job: getMockedJob(0) })
  })

  test('Should not be able to mutate valueBag from a subFlow generator', async () => {
    async function* mutateValueBag(initialBag: ValueBag): AsyncGenerator {
      initialBag.job = 'mutated'
      for await (const value of [1]) {
        yield value
      }
    }
    const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

    await from({ fn: getMockedJobGenerator(1), provides: 'job' })
      .subFlow((sub) => sub({ fn: mutateValueBag, provides: 'sub' }))
      .pipe({ fn: saveMock })
      .run()

    expect(saveMock.mock.calls[0][0]).toEqual({ job: getMockedJob(0) })
  })
})
