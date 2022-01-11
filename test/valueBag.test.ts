import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { sleep } from './helpers/sleep'
import { getMockedJob } from './mocks/getMockedJob'

test('Should provide valueBag properly to the flow', async () => {
  const mockedJob = getMockedJob(0)
  const mockedData = { message: 'This is a cool message' }

  const fetchMock = jest.fn().mockName('fetch').mockResolvedValue(mockedData)
  const mapMock = jest.fn().mockName('map').mockReturnValue(mockedData.message)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  const generatorMock = getMockedGenerator(1)

  new Caminho()
    .source({ fn: generatorMock.generator, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .map({ fn: mapMock, provides: 'mappedData' })
    .save({ fn: saveMock })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(5)

  expect(fetchMock).toBeCalledWith({ job: mockedJob })
  expect(mapMock).toBeCalledWith({ job: mockedJob, rawData: mockedData })
  expect(saveMock).toBeCalledWith({ job: mockedJob, rawData: mockedData, mappedData: mockedData.message })
})
