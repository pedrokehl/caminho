import { filter as filterRxJs } from 'rxjs'
import { type PendingDataControl } from '../utils/PendingDataControl'
import { type Loggers, type ValueBag } from '../types'
import { type OperatorApplier } from './helpers/operatorHelpers'

export type FilterPredicate = (valueBag: ValueBag, index: number) => boolean

export function filter(
  predicate: FilterPredicate,
  loggers: Loggers,
  pendingDataControl?: PendingDataControl,
): OperatorApplier {
  function wrappedFilter(valueBag: ValueBag, index: number): boolean {
    const startedAt = new Date()
    loggers.onStepStarted([valueBag])
    try {
      const filterResult = predicate(valueBag, index)
      if (!filterResult) {
        pendingDataControl?.decrement()
      }
      loggers.onStepFinished([valueBag], startedAt)
      return filterResult
    } catch (err) {
      loggers.onStepFinished([valueBag], startedAt, err as Error)
      throw err
    }
  }

  return filterRxJs(wrappedFilter)
}
