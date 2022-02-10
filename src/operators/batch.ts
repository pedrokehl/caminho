import { bufferTime, filter, mergeAll, mergeMap } from 'rxjs'

import type { Operator, OperatorApplier, ValueBag } from '../types'
import type { Logger } from '../utils/stepLogger'
import { batchHasProvides, applyOperatorsToObservable } from './helpers/operatorHelpers'
import { getNewValueBag } from '../utils/valueBag'

export type BatchParams = BatchParamsProvides | BatchParamsNoProvides

interface BatchOptions {
  batch: {
    maxSize: number
    timeoutMs: number
  }
  maxConcurrency?: number
}
export interface BatchParamsProvides {
  fn: (valueBag: ValueBag[]) => unknown[] | Promise<unknown[]>
  name?: string
  provides: string
  options: BatchOptions
}

export interface BatchParamsNoProvides {
  fn: (valueBag: ValueBag[]) => void | Promise<void>
  name?: string
  options: BatchOptions
}

export function batch(params: BatchParams, logger: Logger): OperatorApplier {
  const getBag = batchHasProvides(params)
    ? valueBagGetterBatchProvides(params.provides)
    : valueBagGetterBatchNoProvides()

  async function wrappedMapper(valueBag: ValueBag[]): Promise<ValueBag[]> {
    const values = await params.fn(valueBag)
    logger()
    return getBag(valueBag, values as unknown[])
  }

  const operators: Operator[] = [
    bufferTime(params.options.batch.timeoutMs, undefined, params.options.batch.maxSize),
    filter((buffer) => buffer.length > 0),
    mergeMap(wrappedMapper, params.options.maxConcurrency) as Operator,
    mergeAll() as Operator,
  ]

  return (observable) => applyOperatorsToObservable(observable, operators)
}

export function valueBagGetterBatchNoProvides() {
  return function getValueBag(valueBag: ValueBag[]): ValueBag[] {
    return [...valueBag]
  }
}

export function valueBagGetterBatchProvides(provides: string) {
  return function getValueBagWithProvides(valueBags: ValueBag[], values: unknown[]): ValueBag[] {
    return valueBags.map((valueBag, index) => getNewValueBag(valueBag, provides, values[index]))
  }
}
