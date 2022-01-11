import { Observable, mergeMap as rxjsMergeMap } from 'rxjs'
import type { OperatorParams, ValueBag } from '../types'

export enum OperationType {
    FETCH = 'fetch',
    MAP = 'map',
    SAVE = 'save'
}

export function pipe(
  observable: Observable<ValueBag>,
  operationType: OperationType,
  operatorParams: OperatorParams,
): Observable<ValueBag> {
  const getBag = getValueBagGetter(operatorParams)

  async function wrappedMapper(valueBag: ValueBag) {
    // TODO: add log for each emitted data
    const value = await operatorParams.fn(valueBag)
    return getBag(valueBag, value)
  }
  return observable.pipe(rxjsMergeMap(wrappedMapper, operatorParams.options?.concurrency ?? 1))
}

function getValueBagGetter(operatorParams: OperatorParams) {
  if (operatorParams.options?.batch) {
    return function getValueBagWithProvides(valueBag: ValueBag[]) {
      return valueBag
    }
  }

  if (operatorParams.provides) {
    const toProvide = operatorParams.provides
    // TODO: Proper typing for ValueBag!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function getValueBagWithProvides(valueBag: ValueBag, value: any) {
      return { ...valueBag, [toProvide]: value }
    }
  }

  return function getValueBag(valueBag: ValueBag) {
    return { ...valueBag }
  }
}
