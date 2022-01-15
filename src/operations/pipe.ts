import { Observable, mergeMap as rxjsMergeMap } from 'rxjs'
import type { CaminhoOptions, ValueBag } from '../types'
import { OperationType, PipeParams } from './operations'
import { getLogger } from './stepLogger'

export function pipe(
  observable: Observable<ValueBag>,
  params: PipeParams,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const getBag = getValueBagGetter(params)
  const logger = getLogger(OperationType.PIPE, params.fn, caminhoOptions)

  async function wrappedMapper(valueBag: ValueBag | ValueBag[]) {
    const stepStartedAt = Date.now()
    const value = await params.fn(valueBag)
    logger(stepStartedAt)
    return getBag(valueBag, value)
  }
  return observable.pipe(rxjsMergeMap(wrappedMapper, params.options?.concurrency ?? 1))
}

function getValueBagGetter(pipeParams: PipeParams) {
  if (pipeParams.options?.batch) {
    return function getValueBagWithProvides(valueBag: ValueBag[]) {
      return valueBag
    }
  }

  if (pipeParams.provides) {
    const toProvide = pipeParams.provides
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
