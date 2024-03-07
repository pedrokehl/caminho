import { Observable, bufferTime, filter, mergeAll, mergeMap } from 'rxjs'

import type { Loggers, ValueBag } from '../types'
import { OperatorApplier } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type BatchParams = {
  name?: string
  batch: {
    maxSize: number
    timeoutMs: number
  }
  maxConcurrency?: number
  fn: (valueBag: ValueBag[]) => unknown[] | Promise<unknown[]>
  provides?: string
}

export function batch(params: BatchParams, loggers: Loggers): OperatorApplier {
  const getBag = params.provides
    ? valueBagGetterBatchProvides(params.provides)
    : valueBagGetterBatchNoProvides()

  async function wrappedStep(valueBag: ValueBag[]): Promise<ValueBag[]> {
    loggers.onStepStarted(valueBag)
    const startTime = new Date()
    const values = await params.fn([...valueBag])
    const newValueBags = getBag(valueBag, values as unknown[])
    loggers.onStepFinished(newValueBags, startTime)
    return newValueBags
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
