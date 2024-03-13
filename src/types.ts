import type { BatchParams } from './operators/batch'
import type { FilterPredicate } from './operators/filter'
import type { PipeParams } from './operators/pipe'
import type { ReduceParams } from './operators/reduce'
import type { InternalOnStepFinished } from './utils/onStepFinished'
import type { InternalOnStepStarted } from './utils/onStepStarted'

export interface Caminho {
  /**
  * receives an array of StepFunctions and each provided step has the same parameters and behavior as a pipe.
  * Useful only for Asynchronous operations.
   */
  pipe: (pipeParams: PipeGenericParams) => this
  /**
  * receives an array of StepFunctions and each provided step has the same parameters and behavior as a pipe.
  * Useful only for Asynchronous operations.
   */
  parallel: (multiPipeParams: PipeGenericParams[]) => this
  filter: (predicate: FilterPredicate) => this
  reduce: <T>(reduceParams: ReduceParams<T>) => this
  run(initialBag?: ValueBag): Promise<ValueBag>
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
  error?: Error
}

export type Loggers = { onStepFinished: InternalOnStepFinished; onStepStarted: InternalOnStepStarted }

export type CaminhoOptions = {
  /**
  * Callback to execute for each step execution start.
  * Useful for logging.
  */
  onStepStarted?: OnStepStarted
  /**
  * Callback to execute for each step execution end.
  * Useful for logging.
  */
  onStepFinished?: OnStepFinished
  /**
  * Number of items allowed to be in the flow in any given point in time.
  * Useful for applying backpressure and making sure the flow won't produce data faster than it can consume.
  */
  maxItemsFlowing?: number
}
