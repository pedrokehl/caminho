import { bufferTime, filter, mergeAll, mergeMap } from 'rxjs'
import { Operator, ValueBag } from '../types'
import { batchHasProvides } from './operationDiscrimator'
import { Logger } from './stepLogger'
import { getNewValueBag } from './valueBag'

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

export function batch(params: BatchParams, logger: Logger): Operator[] {
  const getBag = batchHasProvides(params)
    ? valueBagGetterBatchProvides(params.provides)
    : valueBagGetterBatchNoProvides()

  async function wrappedMapper(valueBag: ValueBag[]): Promise<ValueBag[]> {
    const values = await params.fn(valueBag)
    logger()
    return getBag(valueBag, values as unknown[])
  }

  return [
    bufferTime(params.options.batch.timeoutMs, undefined, params.options.batch.maxSize),
    filter((buffer) => buffer.length > 0),
    mergeMap(wrappedMapper, params.options.maxConcurrency) as Operator,
    mergeAll() as Operator,
  ]
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
