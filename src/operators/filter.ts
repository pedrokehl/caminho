import { filter as filterRxJs } from 'rxjs'
import { type PendingDataControl } from '../utils/PendingDataControl'
import { type Loggers, type ValueBag } from '../types'
import { type OperatorApplierWithRunId } from './helpers/operatorHelpers'

export type FilterPredicate = (valueBag: ValueBag, index: number) => boolean

export function filter(
  predicate: FilterPredicate,
  loggers: Loggers,
  pendingDataControl?: PendingDataControl,
): OperatorApplierWithRunId {
  function wrappedFilter(valueBag: ValueBag, index: number, runId: string): boolean {
    const startedAt = new Date()
    loggers.onStepStarted([valueBag])
    try {
      const filterResult = predicate(valueBag, index)
      if (!filterResult) {
        pendingDataControl?.decrement(runId)
      }
      loggers.onStepFinished([valueBag], startedAt)
      return filterResult
    } catch (err) {
      loggers.onStepFinished([valueBag], startedAt, err as Error)
      throw err
    }
  }

  return function filterOperatorWithRunId(runId: string) {
    return filterRxJs((valueBag, index) => wrappedFilter(valueBag, index, runId))
  }
}
