import { getMockedJob, Job } from './getMockedJob'

export function getMockedGenerator(numberOfValuesToEmit: number) {
  const sequence = new Array(numberOfValuesToEmit).fill(0).map((value, index) => index)
  const response = { called: 0, generator: null }

  async function* generator(): AsyncGenerator<Job> {
    for await (const index of sequence) {
      yield getMockedJob(index)
      response.called += 1
    }
  }

  response.generator = generator
  return response
}
