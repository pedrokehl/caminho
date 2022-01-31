import { Observable, mergeMap as rxjsMergeMap } from 'rxjs'
import { ValueBag } from '../types'
import { pipeHasProvides } from './operationDiscrimator'
import { Logger } from './stepLogger'
import { getNewValueBag } from './valueBag'

export type PipeParams = PipeParamsProvides | PipeParamsNoProvides

interface PipeOptions {
  concurrency?: number
}

export interface PipeParamsProvides {
  fn: (valueBag: ValueBag) => unknown | Promise<unknown>
  provides: string
  options?: PipeOptions
}

export interface PipeParamsNoProvides {
  fn: (valueBag: ValueBag) => void | Promise<void>
  options?: PipeOptions
}

export function pipe(
  observable: Observable<ValueBag>,
  params: PipeParams,
  logger: Logger,
): Observable<ValueBag> {
  const getBag = pipeHasProvides(params) ? valueBagGetterProvides(params.provides) : valueBagGetterNoProvides()

  async function wrappedMapper(valueBag: ValueBag): Promise<ValueBag> {
    const value = await params.fn(valueBag)
    logger()
    return getBag(valueBag, value)
  }
  return observable.pipe(rxjsMergeMap(wrappedMapper, params.options?.concurrency ?? 1))
}

export function valueBagGetterNoProvides() {
  return function getValueBagWithProvides(valueBag: ValueBag) {
    return { ...valueBag }
  }
}

export function valueBagGetterProvides(provides: string) {
  return function getValueBagWithProvides(valueBag: ValueBag, value: unknown) {
    return getNewValueBag(valueBag, provides, value)
  }
}
