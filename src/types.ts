import type { BatchParams } from './operators/batch'
import type { PipeParams } from './operators/pipe'
import type { InternalOnStepFinished } from './utils/onStepFinished'
import type { InternalOnStepStarted } from './utils/onStepStarted'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = any

export type BatchConfig = {
  /**
  * Defines the maximum number of items that a batch can contain.
  */
  maxSize: number
  /**
  * Time before a batch is dispatched if the maxSize is not achieved before.
  */
  timeoutMs: number
}

type StepCommonParams = {
  /**
  * Name of the step, useful when logging the steps
  */
  name?: string
  /**
  * Concurrency is unlimited by default, it means a step can be run concurrently as many times as the flow produces
  * You can limit the concurrency by using the `maxConcurrency` property.
  */
  maxConcurrency?: number
}

export type PipeParamsProvides<Bag, P extends string, V> = StepCommonParams & {
  provides: P
  batch?: undefined
  fn: (valueBag: OpenBag<Bag>) => V
}

export type PipeParamsNoProvides<Bag> = StepCommonParams & {
  provides?: undefined
  batch?: undefined
  fn: (valueBag: OpenBag<Bag>) => unknown
}

export type BatchParamsProvides<Bag, P extends string, V> = StepCommonParams & {
  provides: P
  batch: BatchConfig
  fn: (valueBags: OpenBag<Bag>[]) => readonly V[] | Promise<readonly V[]>
}

export type BatchParamsNoProvides<Bag> = StepCommonParams & {
  provides?: undefined
  batch: BatchConfig
  fn: (valueBags: OpenBag<Bag>[]) => unknown
}

export type ParallelStep<Bag> =
  | (StepCommonParams & {
    provides: string
    batch: BatchConfig
    fn: (valueBags: OpenBag<Bag>[]) => readonly ValueBag[] | Promise<readonly ValueBag[]>
  })
  | (StepCommonParams & { provides?: undefined, batch: BatchConfig, fn: (valueBags: OpenBag<Bag>[]) => unknown })
  | (StepCommonParams & { provides?: string, batch?: undefined, fn: (valueBag: OpenBag<Bag>) => unknown })

type IsAny<T> = 0 extends 1 & T ? true : false

type Flatten<T> = { [K in keyof T]: T[K] }

/**
 * What step functions and run results actually expose: bags are open at runtime because
 * run(initialBag) merges arbitrary properties into every bag, which the flow cannot know at
 * compile time. Declared keys stay precisely typed; any other key is accessible as ValueBag.
 */
export type OpenBag<Bag> = IsAny<Bag> extends true ? ValueBag : Bag & { [key: string]: ValueBag }

/**
 * A step providing key P replaces any previous value under that key, matching the runtime
 * behavior of getNewValueBag (object spread). Untyped bags (any) stay untyped.
 */
export type Provided<Bag, P extends string, V> =
  IsAny<Bag> extends true ? ValueBag : Flatten<Omit<Bag, P> & Record<P, V>>

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never

type StepProvidedValue<S> = S extends { batch: BatchConfig, fn: (...args: never[]) => infer R }
  ? (Awaited<R> extends readonly (infer E)[] ? E : unknown)
  : S extends { fn: (...args: never[]) => infer R } ? Awaited<R> : never

type StepProvides<S> = S extends { provides: infer P extends string }
  ? { [K in P]: StepProvidedValue<S> }
  : never

export type ParallelProvides<Steps extends readonly unknown[]> =
  [StepProvides<Steps[number]>] extends [never] ? unknown : UnionToIntersection<StepProvides<Steps[number]>>

export type ParallelResult<Bag, Steps extends readonly unknown[]> = IsAny<Bag> extends true
  ? ValueBag
  : Flatten<Omit<Bag, keyof ParallelProvides<Steps>> & ParallelProvides<Steps>>

export type TypedReduceParams<Bag, P extends string, A, K extends string> = {
  name?: string
  /**
  * Similar to a callback provided to Array.reduce
  */
  fn: (acc: A, value: OpenBag<Bag>, index: number) => A
  /**
  * Properties to keep in the bag after reducing, keep in mind only the last known value is kept
  */
  keep?: readonly K[]
  seed: A
  provides: P
}

export type ReducedBag<Bag, P extends string, A, K extends string> =
  Flatten<Record<P, A> & { [Key in K]: Key extends keyof Bag ? Bag[Key] : ValueBag }>

export interface Caminho<Bag = ValueBag> {
  pipe<P extends string, V>(pipeParams: BatchParamsProvides<Bag, P, V>): Caminho<Provided<Bag, P, V>>
  pipe(pipeParams: BatchParamsNoProvides<Bag>): Caminho<Bag>
  pipe<P extends string, V>(pipeParams: PipeParamsProvides<Bag, P, V>): Caminho<Provided<Bag, P, Awaited<V>>>
  pipe(pipeParams: PipeParamsNoProvides<Bag>): Caminho<Bag>
  /**
  * Receives an array of StepFunctions and each provided step has the same parameters and behavior as a pipe.
  * Useful only for Asynchronous operations given NodeJS's single-threaded nature.
  * Values are emitted in completion order, like any concurrent step.
   */
  parallel<const Steps extends readonly ParallelStep<Bag>[]>(steps: Steps): Caminho<ParallelResult<Bag, Steps>>
  filter(filterParams: { fn: (valueBag: OpenBag<Bag>, index: number) => boolean, name?: string }): Caminho<Bag>
  reduce<P extends string, A, K extends string = never>(
    reduceParams: TypedReduceParams<Bag, P, A, K>,
  ): Caminho<ReducedBag<Bag, P, A, K>>
  run(initialBag?: ValueBag): Promise<OpenBag<Bag>>
}

export type PipeGenericParams = PipeParams | BatchParams
export type PipeGenericParamsProvides = PipeGenericParams & { provides: string };

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
  * Keep in mind the budget is shared between concurrent runs of the same Caminho instance.
  */
  maxItemsFlowing?: number
}
