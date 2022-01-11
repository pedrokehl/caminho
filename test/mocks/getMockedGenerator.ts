import { getMockedJob, Job } from './getMockedJob'

export function getMockedGenerator(numberOfValuesToEmit: number) {
  const sequence = new Array(numberOfValuesToEmit).fill(0).map((value, index) => index)

  return async function* generator(): AsyncGenerator<Job> {
    for await (const index of sequence) {
      yield getMockedJob(index)
    }
  }
}
