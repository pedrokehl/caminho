import { Observable, map, reduce as reduceRxJs } from 'rxjs'
import type { Loggers, ValueBag } from '../types'
import { PendingDataControl } from '../utils/PendingDataControl'
import { OperatorApplier } from './helpers/operatorHelpers'
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
  const { provides } = reduceParams
  const keepAfterReduce = reduceParams.keep ?? []
  let initialBag: ValueBag = {}

  function wrappedReduce(acc: T, valueBag: ValueBag, index: number): T {
    const startedAt = new Date()
    loggers.onStepStarted([valueBag])
    const reduceResult = reduceParams.fn(acc, valueBag, index)
    pendingDataControl?.decrement()
    loggers.onStepFinished([valueBag], startedAt)
    initialBag = valueBag
    return reduceResult
  }

  return function operatorApplier(observable: Observable<ValueBag>) {
    return observable
      .pipe(reduceRxJs(wrappedReduce, reduceParams.seed))
      .pipe(map((reduceResult: T) => getNewValueBag(pick(initialBag, keepAfterReduce), provides, reduceResult)))
  }
}
