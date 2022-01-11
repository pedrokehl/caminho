import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { sleep } from './helpers/sleep'

test('Should call generator and run all function provided to the flow', async () => {
  const mapMock = jest.fn()
  const fetchMock = jest.fn()
  const NUMBER_OF_ITERATIONS = 50

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .map({ fn: mapMock, provides: 'mappedData' })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(5)

  expect(fetchMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
  expect(mapMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
})
