import { bufferTime, filter, mergeAll, mergeMap, Observable } from 'rxjs'
import { CaminhoOptions, ValueBag, OperationType } from '../types'
import { getLogger } from './stepLogger'
import { getNewValueBag } from './valueBag'

export type BatchParams = BatchParamsProvides | BatchParamsNoProvides

interface BatchOptions {
  batch: {
    maxSize: number
    timeoutMs: number
  }
  concurrency?: number
}
export interface BatchParamsProvides {
  fn: (valueBag: ValueBag[]) => unknown[] | Promise<unknown[]>
  provides: string
  options: BatchOptions
}

export interface BatchParamsNoProvides {
  fn: (valueBag: ValueBag[]) => void | Promise<void>
  options: BatchOptions
}

export function batch(
  observable: Observable<ValueBag>,
  params: BatchParams,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const getBag = hasProvides(params) ? valueBagGetterBatchProvides(params.provides) : valueBagGetterBatchNoProvides()
  const logger = getLogger(OperationType.BATCH, params.fn, caminhoOptions)

  async function wrappedMapper(valueBag: ValueBag[]): Promise<ValueBag[]> {
    const stepStartedAt = Date.now()
    const values = await params.fn(valueBag)
    logger(stepStartedAt)
    return getBag(valueBag, values as unknown[])
  }

  return observable
    .pipe(
      bufferTime(params.options.batch.timeoutMs, undefined, params.options.batch.maxSize),
      filter((buffer) => buffer.length > 0),
    )
    .pipe(mergeMap(wrappedMapper, params.options.concurrency ?? 1))
    .pipe(mergeAll())
}

function hasProvides(params: BatchParams): params is BatchParamsProvides {
  return !!(params as BatchParamsProvides).provides
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
