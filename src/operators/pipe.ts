import { mergeMap } from 'rxjs'
import type { ValueBag, Loggers } from '../types'
import { type OperatorApplier } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type PipeParams = {
  /**
  * The name of the property to be assigned to the cumulate context.
  * The value of the property is the returned value from the step.
  */
  provides?: string
  /**
  * Name of the step, useful when logging the steps
  */
  name?: string
  /**
  * Concurrency is unlimited by default, it means a step can be run concurrently as many times as the flow produces
  * You can limit the concurrency by using the `maxConcurrency` property.
  * This is useful for example when you are calling an API that can't handle too many concurrent requests.
   */
  maxConcurrency?: number
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
