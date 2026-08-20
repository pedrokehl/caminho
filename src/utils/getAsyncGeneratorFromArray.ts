import type { ValueBag } from '../types'

export function getAsyncGeneratorFromArray(items: unknown[]): () => AsyncGenerator {
  // the flow engine consumes AsyncGenerators, even though an in-memory array needs no awaiting
  // eslint-disable-next-line @typescript-eslint/require-await
  return async function* asyncGeneratorFromArray(): AsyncGenerator {
    for (const item of items) {
      yield item
    }
  }
}

export function getAsyncGeneratorFromFn(
  fn: (valueBag: ValueBag) => unknown,
): (valueBag: ValueBag) => AsyncGenerator {
  return async function* asyncGeneratorFromFn(valueBag: ValueBag): AsyncGenerator {
    yield await fn(valueBag)
  }
}
