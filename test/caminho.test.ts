import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './getMockedGenerator'

test('Should call generator and run all function provided to the flow', async () => {
  const mapMock = jest.fn()
  const fetchMock = jest.fn()
  const NUMBER_OF_ITERATIONS = 50

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)

  new Caminho()
    .source(generatorMock.generator, 'job')
    .fetch(fetchMock, 'rawData')
    .map(mapMock, 'mappedData')
    .start()

  await sleep(5)

  expect(generatorMock.called).toBe(NUMBER_OF_ITERATIONS)
  expect(fetchMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
  expect(mapMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
})

test('Should provide valueBag properly to the flow', async () => {
  const mockedJob = { job_id: '1' }
  const mockedData = { message: 'This is a cool message' }

  const fetchMock = jest.fn().mockName('fetch').mockResolvedValue(mockedData)
  const mapMock = jest.fn().mockName('map').mockReturnValue(mockedData.message)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  const generatorMock = getMockedGenerator(1)

  new Caminho()
    .source(generatorMock.generator, 'job')
    .fetch(fetchMock, 'rawData')
    .map(mapMock, 'mappedData')
    .save(saveMock)
    .start()

  await sleep(5)

  expect(fetchMock).toBeCalledWith({ job: mockedJob })
  expect(mapMock).toBeCalledWith({ job: mockedJob, rawData: mockedData })
  expect(saveMock).toBeCalledWith({ job: mockedJob, rawData: mockedData, mappedData: mockedData.message })
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
