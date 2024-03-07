import { fromGenerator, ValueBag } from '../../src'
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

    await fromGenerator({ fn: generatorMock, provides: 'job' })
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

    await fromGenerator({ fn: getMockedJobGenerator(1), provides: 'job' })
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

    await fromGenerator({ fn: getMockedJobGenerator(1), provides: 'job' })
      .pipe({ fn: mutateValueBag, batch: { maxSize: 1, timeoutMs: 1 } })
      .pipe({ fn: saveMock })
      .run()

    expect(saveMock.mock.calls[0][0]).toEqual({ job: getMockedJob(0) })
  })

  test('Should correctly receive the initial value provided on run', async () => {
    const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

    await fromGenerator({ fn: getMockedJobGenerator(1), provides: 'job' })
      .pipe({ fn: saveMock })
      .run({ initial: true })

    expect(saveMock.mock.calls[0][0]).toEqual({ job: getMockedJob(0), initial: true })
  })
})
