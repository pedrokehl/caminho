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

test('Should batch events after the provided count is reached from "maxSize"', async () => {
  const NUMBER_OF_ITERATIONS = 4

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  const maxSize = 2

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .save({ fn: saveMock, options: { batch: { maxSize, timeoutMs: 10 }, concurrency: 2 } })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(saveMock).toHaveBeenCalledTimes(2)
  expect(saveMock.mock.calls[0][0]).toHaveLength(maxSize)
  expect(saveMock.mock.calls[1][0]).toHaveLength(maxSize)
})

test('Should work properly with concurrency', async () => {
  const NUMBER_OF_ITERATIONS = 50
  const MAX_SIZE = 5
  const CONCURRENCY = 5
  let concurrentExecutions = 0
  const concurrentExecutionTrack: number[] = []

  async function saveMock() {
    concurrentExecutions += 1
    await sleep(2)
    concurrentExecutionTrack.push(concurrentExecutions)
    concurrentExecutions -= 1
    return 'save'
  }

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const anotherSaveMock = jest.fn().mockName('anotherSave').mockResolvedValue(null)

  const options = { concurrency: CONCURRENCY, batch: { maxSize: MAX_SIZE, timeoutMs: 10 } }

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .save({ fn: saveMock, options })
    .save({ fn: anotherSaveMock })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(100)

  expect(concurrentExecutionTrack).toHaveLength(NUMBER_OF_ITERATIONS / MAX_SIZE)
  expect(Math.max(...concurrentExecutionTrack)).toBe(CONCURRENCY)
})

test('Should call the next operator with the flatten events', async () => {
  const NUMBER_OF_ITERATIONS = 12
  const MAX_SIZE = 4

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)
  const anotherSaveMock = jest.fn().mockName('anotherSave').mockResolvedValue(null)

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .save({ fn: saveMock, options: { batch: { maxSize: MAX_SIZE, timeoutMs: 10 } } })
    .save({ fn: anotherSaveMock })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(saveMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS / MAX_SIZE)
  expect(anotherSaveMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS)
})

test.todo('Should properly provide values from a batched execution')
