export function getAsyncGeneratorFromArray(items: unknown[]): () => AsyncGenerator {
  return async function* asyncGeneratorFromArray(): AsyncGenerator {
    for (const item of items) {
      yield item
    }
  }
}
