import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { sleep } from './helpers/sleep'

test.todo('Should batch events after the provided time has passed from "timeoutMs"', async () => {
  const NUMBER_OF_ITERATIONS = 4

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  const batchMaxSize = 2

  new Caminho()
    .source({ fn: generatorMock.generator, provides: 'job' })
    .save({ fn: saveMock, options: { batch: { maxSize: batchMaxSize, timeoutMs: 10 } } })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(saveMock).toHaveBeenCalledTimes(batchMaxSize / 2)
})

test.todo('Should batch events after the provided count is reached from "maxSize"')

test.todo('Should properly provide values from a batched execution')
