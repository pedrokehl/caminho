import { Caminho } from '../src/caminho'
import { getMockedJobGenerator } from './mocks/generator.mock'
import { sleep } from '../src/utils/sleep'

test('Should run components in series if maxConcurrency is set to 1', async () => {
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

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  await new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .pipe({ fn: fetchMock, provides: 'rawData', options: { maxConcurrency: 1 } })
    .pipe({ fn: saveMock })
    .run()

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

  const generatorMock = getMockedJobGenerator(NUMBER_OF_ITERATIONS)
  const saveMock = jest.fn().mockName('save').mockResolvedValue(null)

  await new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .pipe({ fn: fetchMock, provides: 'rawData', options: { maxConcurrency: 5 } })
    .pipe({ fn: saveMock })
    .run()

  expect(saveMock).toHaveBeenCalledTimes(NUMBER_OF_ITERATIONS)
  expect(Math.max(...concurrentExecutionTrack)).toBe(5)
})
