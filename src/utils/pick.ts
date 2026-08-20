export function pick<T, K extends keyof T>(fullObject: T, keys: K[]): Pick<T, K> {
  return keys.reduce<Partial<T>>((partialObject, key) => {
    // Reassigning here makes sense since the performance is much better than spreading
    // eslint-disable-next-line no-param-reassign
    partialObject[key] = fullObject[key]
    return partialObject
  }, {}) as Pick<T, K>
}
