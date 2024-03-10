import { mergeMap } from 'rxjs'
import type { ValueBag, Loggers, BasePipe } from '../types'
import { OperatorApplier } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type PipeParams = BasePipe & {
  fn: (valueBag: ValueBag) => unknown | Promise<unknown>
}

export function pipe(params: PipeParams, loggers: Loggers): OperatorApplier {
  const getBag = params.provides ? valueBagGetterProvides(params.provides) : valueBagGetterNoProvides()

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
