import { Observable, OperatorFunction } from 'rxjs'
import { BatchParams } from './operations/batch'
import { PipeParams } from './operations/pipe'

// TODO: Proper typing for ValueBag!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = Record<string, any>

type ValueBagOrBatch = ValueBag | ValueBag[]

export type OperatorApplier = (observable: Observable<ValueBag>) => Observable<ValueBag>
export type Operator = OperatorFunction<ValueBagOrBatch, ValueBagOrBatch>

export type PipeGenericParams = PipeParams | BatchParams

export type OnEachStep = (params: OnEachStepParams) => void

export interface OnEachStepParams {
  name: string
  type: OperationType
  tookMs: number
  status: OperationStatus
}

export enum OperationType {
  GENERATE = 'generate',
  PIPE = 'pipe',
  BATCH = 'batch',
}

export enum OperationStatus {
  SUCCESS = 'success'
}
