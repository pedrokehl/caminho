import type { OperatorFunction } from 'rxjs'
import type { BatchParams } from './operators/batch'
import type { PipeParams } from './operators/pipe'

// TODO: Proper typing for ValueBag!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = Record<string, any>

type ValueBagOrBatch = ValueBag | ValueBag[]

export type Operator = OperatorFunction<ValueBagOrBatch, ValueBagOrBatch>

export type PipeGenericParams = PipeParams | BatchParams

export type OnEachStep = (params: OnEachStepParams) => void

export interface OnEachStepParams {
  name: string
  type: OperationType
  tookMs: number
}

export enum OperationType {
  GENERATE = 'generate',
  PIPE = 'pipe',
  BATCH = 'batch',
}

export interface CaminhoOptions {
  onEachStep?: OnEachStep
}

export interface ReduceParams<A> {
  fn: (acc: A, value: ValueBag, index: number) => A,
  seed: A,
  provides: string
}
