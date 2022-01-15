import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/generator.mock'
import { getMockedJob } from './mocks/job.mock'

test('Should provide valueBag properly to the flow', async () => {
  const mockedJob = getMockedJob(0)
  const mockedData = { message: 'This is a cool message' }

  const fetchMock = jest.fn().mockName('fetch').mockResolvedValue(mockedData)
  const mapMock = jest.fn().mockName('map').mockReturnValue(mockedData.message)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  const generatorMock = getMockedGenerator(1)

  await new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .pipe({ fn: fetchMock, provides: 'rawData' })
    .pipe({ fn: mapMock, provides: 'mappedData' })
    .pipe({ fn: saveMock })
    .run()

  expect(fetchMock).toBeCalledWith({ _uniqueId: expect.any(Number), job: mockedJob })
  expect(mapMock).toBeCalledWith({ _uniqueId: expect.any(Number), job: mockedJob, rawData: mockedData })
  expect(saveMock).toBeCalledWith({
    _uniqueId: expect.any(Number),
    job: mockedJob,
    rawData: mockedData,
    mappedData: mockedData.message,
  })
})
