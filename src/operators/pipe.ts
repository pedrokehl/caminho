import { mergeMap } from 'rxjs'
import type { ValueBag, Loggers } from '../types'
import { OperatorApplier, pipeHasProvides } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type PipeParams = PipeParamsProvides | PipeParamsNoProvides

interface BasePipeParams {
  name?: string
  maxConcurrency?: number
  fn: (valueBag: ValueBag) => unknown | Promise<unknown>
}

export type PipeParamsNoProvides = BasePipeParams
export interface PipeParamsProvides extends BasePipeParams {
  provides: string
}

export function pipe(params: PipeParams, loggers: Loggers): OperatorApplier {
  const getBag = pipeHasProvides(params) ? valueBagGetterProvides(params.provides) : valueBagGetterNoProvides()

  async function wrappedStep(valueBag: ValueBag): Promise<ValueBag> {
    loggers.onStepStarted([valueBag])
    const startTime = new Date()
    const value = await params.fn({ ...valueBag })
    const newBag = getBag(valueBag, value)
    loggers.onStepFinished([newBag], startTime)
    return newBag
  }
  return mergeMap(wrappedStep, params?.maxConcurrency)
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
