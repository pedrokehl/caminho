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

  run(initialBag: ValueBag, pickLastValues: string[]): Promise<unknown>
  run(initialBag?: ValueBag): Promise<undefined>
}

export type BasePipe = {
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
