import { Observable, mergeMap as rxjsMergeMap } from 'rxjs'
import type { CaminhoOptions, ValueBag } from '../types'
import { OperationType, OperatorParams } from './operations'
import { getLogger } from './stepLogger'

export function pipe(
  observable: Observable<ValueBag>,
  operationType: OperationType,
  operatorParams: OperatorParams,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const getBag = getValueBagGetter(operatorParams)
  const logger = getLogger(operationType, operatorParams.fn, caminhoOptions)

  async function wrappedMapper(valueBag: ValueBag | ValueBag[]) {
    const stepStartedAt = Date.now()
    const value = await operatorParams.fn(valueBag)
    logger(stepStartedAt)
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
