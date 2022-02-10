import { mergeMap } from 'rxjs'
import { Operator, ValueBag } from '../types'
import { pipeHasProvides } from './operationDiscrimator'
import { Logger } from './stepLogger'
import { getNewValueBag } from './valueBag'

export type PipeParams = PipeParamsProvides | PipeParamsNoProvides

interface PipeOptions {
  maxConcurrency?: number
}

export interface PipeParamsProvides {
  fn: (valueBag: ValueBag) => unknown | Promise<unknown>
  name?: string
  provides: string
  options?: PipeOptions
}

export interface PipeParamsNoProvides {
  fn: (valueBag: ValueBag) => void | Promise<void>
  name?: string
  options?: PipeOptions
}

export function pipe(params: PipeParams, logger: Logger): Operator[] {
  const getBag = pipeHasProvides(params) ? valueBagGetterProvides(params.provides) : valueBagGetterNoProvides()

  async function wrappedMapper(valueBag: ValueBag): Promise<ValueBag> {
    const value = await params.fn(valueBag)
    logger()
    return getBag(valueBag, value)
  }
  return [
    mergeMap(wrappedMapper, params.options?.maxConcurrency),
  ]
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
