import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'

test('Should call generator and run all function provided to the flow', async () => {
  const mapMock = jest.fn()
  const fetchMock = jest.fn()
  const NUMBER_OF_ITERATIONS = 50

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)

  await new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .map({ fn: mapMock, provides: 'mappedData' })
    .run()

  expect(fetchMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
  expect(mapMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
})
