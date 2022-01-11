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
  const getBag = getValueBagGetter(operatorParams.provides)

  async function wrappedMapper(valueBagPromise: Promise<ValueBag>) {
    // TODO: add log for each emitted data
    const valueBag = await valueBagPromise
    const value = await operatorParams.fn(valueBag)
    return getBag(valueBag, value)
  }
  return observable.pipe(rxjsMergeMap(wrappedMapper, operatorParams.options?.concurrency ?? 1))
}

function getValueBagGetter(provides?: string) {
  if (provides) {
    // TODO: Proper typing for ValueBag!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function getValueBagWithProvides(valueBag: ValueBag, value: any) {
      return { ...valueBag, [provides]: value }
    }
  }

  return function getValueBag(valueBag: ValueBag) {
    return { ...valueBag }
  }
}
