import { bufferTime, filter, mergeAll, mergeMap } from 'rxjs'

import type { Loggers, Operator, ValueBag } from '../types'
import { batchHasProvides, applyOperatorsToObservable, OperatorApplier } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type BatchParams = BatchParamsProvides | BatchParamsNoProvides

interface BaseBatchParams {
  name?: string
  batch: {
    maxSize: number
    timeoutMs: number
  }
  maxConcurrency?: number
}
export interface BatchParamsProvides extends BaseBatchParams {
  fn: (valueBag: ValueBag[]) => unknown[] | Promise<unknown[]>
  provides: string
}

export interface BatchParamsNoProvides extends BaseBatchParams {
  fn: (valueBag: ValueBag[]) => void | Promise<void>
}

export function batch(params: BatchParams, loggers: Loggers): OperatorApplier {
  const getBag = batchHasProvides(params)
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

  const operators: Operator[] = [
    bufferTime(params.batch.timeoutMs, undefined, params.batch.maxSize),
    filter((buffer) => buffer.length > 0),
    mergeMap(wrappedStep, params.maxConcurrency) as Operator,
    mergeAll() as Operator,
  ]

  return (observable) => applyOperatorsToObservable(observable, operators)
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
