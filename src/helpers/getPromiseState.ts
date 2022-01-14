export enum PromiseState {
  PENDING = 'pending',
  FULFILLED = 'fulfilled'
}

export async function getPromiseState(p: Promise<unknown>): Promise<PromiseState> {
  const t = {}
  const promiseResolved = await Promise.race([p, t])
  return promiseResolved === t ? PromiseState.PENDING : PromiseState.FULFILLED
}
