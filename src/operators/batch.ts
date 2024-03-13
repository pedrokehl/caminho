import { type Observable, bufferTime, filter, mergeAll, mergeMap } from 'rxjs'

import type { Loggers, ValueBag } from '../types'
import { type OperatorApplier } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type BatchParams = {
  /**
  * The name of the property to be assigned to the cumulate context.
  * The value of the property is the returned value from the step.
  * Keep in mind that the order of the returned values must be the same order you received the values
  * so it gets properly assigned to the context
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
  fn: (valueBag: ValueBag[]) => unknown[] | Promise<unknown[]>
  batch: {
    /**
    * Defines the maximum number of items that a batch can contain.
    */
    maxSize: number
    /**
    * Time before a batch is dispatched if the maxSize is not achieved before.
    */
    timeoutMs: number
  }
}

export function batch(params: BatchParams, loggers: Loggers): OperatorApplier {
  const getBag = params.provides
    ? valueBagGetterBatchProvides(params.provides)
    : valueBagGetterBatchNoProvides()

  async function wrappedStep(valueBag: ValueBag[]): Promise<ValueBag[]> {
    loggers.onStepStarted(valueBag)
    const startTime = new Date()
    try {
      const values = await params.fn([...valueBag])
      const newValueBags = getBag(valueBag, values)
      loggers.onStepFinished(newValueBags, startTime)
      return newValueBags
    } catch (err) {
      loggers.onStepFinished(valueBag, startTime, err as Error)
      throw err
    }
  }

  return function operatorApplier(observable: Observable<ValueBag>) {
    return observable
      .pipe(bufferTime(params.batch.timeoutMs, undefined, params.batch.maxSize))
      .pipe(filter((buffer) => buffer.length > 0))
      .pipe(mergeMap(wrappedStep, params.maxConcurrency))
      .pipe(mergeAll())
  }
}

export function valueBagGetterBatchNoProvides() {
  return function getValueBag(valueBag: ValueBag[]): ValueBag[] {
    return valueBag
  }
}

export function valueBagGetterBatchProvides(provides: string) {
  return function getValueBagWithProvides(valueBags: ValueBag[], values: unknown[]): ValueBag[] {
    return valueBags.map((valueBag, index) => getNewValueBag(valueBag, provides, values[index]))
  }
}
