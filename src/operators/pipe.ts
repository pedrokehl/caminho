import { mergeMap } from 'rxjs'
import { ValueBag } from '../types'
import { OperatorApplier, pipeHasProvides } from './helpers/operatorHelpers'
import { Logger } from '../utils/stepLogger'
import { getNewValueBag } from '../utils/valueBag'

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

export function pipe(params: PipeParams, logger: Logger): OperatorApplier {
  const getBag = pipeHasProvides(params) ? valueBagGetterProvides(params.provides) : valueBagGetterNoProvides()

  async function wrappedStep(valueBag: ValueBag): Promise<ValueBag> {
    const value = await params.fn({ ...valueBag })
    logger()
    return getBag(valueBag, value)
  }
  return mergeMap(wrappedStep, params.options?.maxConcurrency)
}

export function valueBagGetterNoProvides() {
  return function getValueBagWithProvides(valueBag: ValueBag) {
    return valueBag
  }
}

export function valueBagGetterProvides(provides: string) {
  return function getValueBagWithProvides(valueBag: ValueBag, value: unknown) {
    return getNewValueBag(valueBag, provides, value)
  }
}
