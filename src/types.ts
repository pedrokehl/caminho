import type { BatchParams } from './operators/batch'
import type { FilterPredicate } from './operators/filter'
import type { PipeParams } from './operators/pipe'
import type { ReduceParams } from './operators/reduce'
import type { InternalOnStepFinished } from './utils/onStepFinished'
import type { InternalOnStepStarted } from './utils/onStepStarted'

export interface Caminho {
  pipe: (pipeParams: PipeGenericParams) => this
  parallel: (multiPipeParams: PipeGenericParams[]) => this
  filter: (predicate: FilterPredicate) => this
  reduce: <T>(reduceParams: ReduceParams<T>) => this

  run(initialBag: ValueBag, pickLastValues: string[]): Promise<unknown>
  run(initialBag?: ValueBag): Promise<undefined>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = any

export type PipeGenericParams = PipeParams | BatchParams

export type OnStepStarted = (params: OnStepStartedParams) => void
export type OnStepFinished = (params: OnStepFinishedParams) => void

export type OnStepStartedParams = {
  name: string
  received: number
  valueBags: ValueBag[]
}

export type OnStepFinishedParams = {
  name: string
  tookMs: number
  emitted: number
  valueBags: ValueBag[]
}

export type Loggers = { onStepFinished: InternalOnStepFinished; onStepStarted: InternalOnStepStarted }

export type CaminhoOptions = {
  onStepStarted?: OnStepStarted
  onStepFinished?: OnStepFinished
  maxItemsFlowing?: number
}
