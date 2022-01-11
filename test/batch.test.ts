import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { sleep } from './helpers/sleep'

test('Should emit batch after the "timeoutMs" time has passed if the "maxSize" is not reached', async () => {
  const NUMBER_OF_ITERATIONS = 2

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  const maxSize = 4

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .save({ fn: saveMock, options: { batch: { maxSize, timeoutMs: 10 } } })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(saveMock).toHaveBeenCalledTimes(1)
  expect(saveMock.mock.calls[0][0]).toHaveLength(NUMBER_OF_ITERATIONS)
})

test.todo('Should batch events after the provided count is reached from "maxSize"')

test.todo('Should work properly with concurrency')

test.todo('Should properly provide values from a batched execution')
