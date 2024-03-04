export function pick<T, K extends keyof T>(fullObject: T, keys: K[]): Pick<T, K> {
  return keys.reduce((partialObject: Partial<T>, key: keyof T) => {
    // Reassigning here makes sense since the performance is much better than spreading
    // eslint-disable-next-line no-param-reassign
    partialObject[key] = fullObject[key]
    return partialObject
  }, {} as Partial<T>) as Pick<T, K>
}
