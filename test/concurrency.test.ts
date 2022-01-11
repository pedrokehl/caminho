import { Caminho } from '../src/caminho'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { sleep } from './helpers/sleep'

test('Should not run components in concurrency if not set', async () => {
  const NUMBER_OF_ITERATIONS = 5
  let concurrentExecutions = 0

  async function fetchMock() {
    if (concurrentExecutions > 0) {
      expect(concurrentExecutions).toBe(0)
    }
    concurrentExecutions += 1
    await sleep(5)
    concurrentExecutions -= 1
    return 'fetch'
  }

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .save({ fn: saveMock })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(saveMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS)
})

test('Should run components in concurrency if set', async () => {
  const NUMBER_OF_ITERATIONS = 10
  let concurrentExecutions = 0
  const concurrentExecutionTrack: number[] = []

  async function fetchMock() {
    concurrentExecutions += 1
    await sleep(10)
    concurrentExecutionTrack.push(concurrentExecutions)
    concurrentExecutions -= 1
    return 'fetch'
  }

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData', options: { concurrency: 5 } })
    .save({ fn: saveMock })
    .start()

  // TODO: replace sleep with proper checking execution status
  await sleep(50)

  expect(saveMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS)
  expect(Math.max(...concurrentExecutionTrack)).toBe(5)
})
