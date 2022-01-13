import { CaminhoMapper } from '../types'

export interface OperatorParams {
  fn: CaminhoMapper
  options?: {
    concurrency?: number
    batch?: {
      maxSize: number
      timeoutMs: number
    }
  }
  provides?: string
}

export interface OperatorProviderParams extends OperatorParams {
  provides: string
}

export interface OnEachStepParams {
  name: string
  type: OperationType
  tookMs: number
  status: OperationStatus
}

export enum OperationType {
  FETCH = 'fetch',
  MAP = 'map',
  SAVE = 'save',
  GENERATE = 'generate'
}

export enum OperationStatus {
  SUCCESS = 'success'
}
