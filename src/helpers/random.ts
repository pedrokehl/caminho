export function getRandomInt(): number {
  return getRandomIntRange(0, Number.MAX_SAFE_INTEGER)
}

export function getRandomIntRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
