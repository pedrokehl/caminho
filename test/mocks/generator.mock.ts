import { getMockedJob, type Job } from './job.mock'

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

export function getThrowingGenerator(error: Error) {
  // eslint-disable-next-line require-yield
  return async function* throwingGenerator(): AsyncGenerator<number> {
    throw error
  }
}

export function getGeneratorThrowsAfterThYields(error: Error, numberOfYieldsBeforeThrow: number) {
  return async function* throwingGenerator(): AsyncGenerator<number> {
    const items = new Array(numberOfYieldsBeforeThrow).fill(0)
    for await (const value of items) {
      yield value
    }
    throw error
  }
}
