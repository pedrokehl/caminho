import { getMockedJob, Job } from './job.mock'

export function getMockedJobGenerator(numberOfValuesToEmit: number) {
  const jobs = new Array(numberOfValuesToEmit).fill(0).map((_, index) => getMockedJob(index))
  return getMockedGenerator<Job>(jobs)
}

export function getMockedGenerator<T>(data: T[]) {
  return async function* generator(): AsyncGenerator<T> {
    for await (const value of data) {
      yield value
    }
  }
}
