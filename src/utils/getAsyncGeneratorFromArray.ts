import { ValueBag } from '../types'

export function getAsyncGeneratorFromArray(items: unknown[]): () => AsyncGenerator {
  return async function* asyncGeneratorFromArray(): AsyncGenerator {
    for (const item of items) {
      yield item
    }
  }
}

export function getAsyncGeneratorFromFn(
  fn: (valueBag: ValueBag) => Promise<unknown> | unknown,
): (valueBag: ValueBag) => AsyncGenerator {
  return async function* asyncGeneratorFromFn(valueBag: ValueBag): AsyncGenerator {
    yield await fn(valueBag)
  }
}
