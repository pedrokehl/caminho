import { map, merge, mergeMap, type Observable, share } from 'rxjs'
import type { PipeGenericParams, ValueBag } from '../types'
import { buildValueBagAccumulator } from '../utils/valueBag'
import { type OperatorApplier } from './helpers/operatorHelpers'

/**
 * Internal symbol used to track item identity across parallel branches.
 * Symbol-keyed properties survive the object spreads performed by pipe/batch steps.
 */
export const PARALLEL_ITEM_ID = Symbol('caminhoParallelItemId')

type BranchEmission = { branchIndex: number, valueBag: ValueBag }

export function parallel(params: PipeGenericParams[], operatorAppliers: OperatorApplier[]): OperatorApplier {
  const getAccumulatedBag = buildValueBagAccumulator(params)
  const branchCount = operatorAppliers.length

  // This function is invoked once per run, so the state inside joinByItemId is per-run.
  return function parallelOperatorApplier(observable: Observable<ValueBag>) {
    let itemIdSequence = 0
    const tagged$ = observable.pipe(
      map((valueBag: ValueBag) => ({ ...valueBag, [PARALLEL_ITEM_ID]: itemIdSequence++ })),
      share(),
    )

    const branches = operatorAppliers.map((applier, branchIndex) => applier(tagged$)
      .pipe(map((valueBag: ValueBag): BranchEmission => ({ branchIndex, valueBag }))))

    return merge(...branches).pipe(joinByItemId(branchCount, getAccumulatedBag))
  }
}

/**
 * Branches emit in completion order, not input order, so results cannot be paired positionally (e.g. with zip).
 * Instead, emissions are grouped by their item id and emitted once every branch has produced the item.
 */
function joinByItemId(branchCount: number, getAccumulatedBag: (valueBags: ValueBag[]) => ValueBag) {
  const pending = new Map<number, { valueBags: ValueBag[], received: number }>()

  return mergeMap(function joinEmission(emission: BranchEmission): ValueBag[] {
    const itemId = emission.valueBag[PARALLEL_ITEM_ID]
    const entry = pending.get(itemId) ?? { valueBags: new Array(branchCount), received: 0 }
    if (entry.received === 0) {
      pending.set(itemId, entry)
    }
    entry.valueBags[emission.branchIndex] = emission.valueBag
    entry.received += 1

    if (entry.received < branchCount) {
      return []
    }
    pending.delete(itemId)
    return [removeItemIdTag(getAccumulatedBag(entry.valueBags))]
  })
}

function removeItemIdTag(valueBag: ValueBag): ValueBag {
  // PARALLEL_ITEM_ID is a constant internal symbol, not arbitrary input; delete avoids
  // allocating a copy of the bag for every item passing through parallel()
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete valueBag[PARALLEL_ITEM_ID]
  return valueBag
}
