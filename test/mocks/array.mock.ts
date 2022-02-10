export function getNumberedArray(size: number) {
  return new Array(size).fill(0).map((_, index) => index + 1)
}
