import { filter as filterRxJs } from 'rxjs'
import { type PendingDataControl } from '../utils/PendingDataControl'
import { type ValueBag } from '../types'
import { type OperatorApplier } from './helpers/operatorHelpers'

export type FilterPredicate = (valueBag: ValueBag, index: number) => boolean

export function filter(predicate: FilterPredicate, pendingDataControl?: PendingDataControl): OperatorApplier {
  if (!pendingDataControl) {
    return filterRxJs(predicate)
  }

  function wrappedFilter(valueBag: ValueBag, index: number): boolean {
    const filterResult = predicate(valueBag, index)
    if (!filterResult) {
      pendingDataControl?.decrement()
    }
    return filterResult
  }

  return filterRxJs(wrappedFilter)
}
