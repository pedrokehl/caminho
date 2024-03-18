import { type Observable, map, reduce as reduceRxJs } from 'rxjs'
import type { Loggers, ValueBag } from '../types'
import { type PendingDataControl } from '../utils/PendingDataControl'
import { type OperatorApplier } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'
import { pick } from '../utils/pick'

export type ReduceParams<A> = {
  name?: string
  fn: (acc: A, value: ValueBag, index: number) => A
  // Properties to keep in the bag after reducing, keep in mind only last value of current flow will be computed
  keep?: string[]
  seed: A
  provides: string
}

export function reduce<T>(
  reduceParams: ReduceParams<T>,
  loggers: Loggers,
  pendingDataControl?: PendingDataControl,
): OperatorApplier {
  const { provides, keep, seed } = reduceParams
  const immutableSeed = Object.freeze(seed)
  let lastBag: ValueBag = {}

  function wrappedReduce(acc: T, valueBag: ValueBag, index: number): T {
    const startedAt = new Date()
    loggers.onStepStarted([valueBag])
    // RxJs doesn't create a structureClone from the seed parameter when start processing.
    // Developer can implement function that mutate the "acc" on reduce.fn
    // To safely avoid conflicts between different runs, we copy the seed when it's a new run
    const renewedAcc = index === 0 ? structuredClone(immutableSeed) : acc
    try {
      const reduceResult = reduceParams.fn(renewedAcc, valueBag, index)
      loggers.onStepFinished([valueBag], startedAt)
      lastBag = valueBag
      return reduceResult
    } catch (err) {
      loggers.onStepFinished([valueBag], startedAt, err as Error)
      throw err
    } finally {
      pendingDataControl?.decrement()
    }
  }

  return function operatorApplier(observable: Observable<ValueBag>) {
    return observable
      .pipe(reduceRxJs(wrappedReduce, seed))
      .pipe(map((reduceResult: T) => {
        pendingDataControl?.increment()
        return getNewValueBag(pick(lastBag, keep ?? []), provides, reduceResult)
      }))
  }
}
