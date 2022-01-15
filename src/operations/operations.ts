import { CaminhoGenerator, CaminhoMapper } from '../types'

export interface GeneratorParams {
  fn: CaminhoGenerator
  provides: string
  maxItemsFlowing?: number
}

export interface PipeParams {
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

export interface OnEachStepParams {
  name: string
  type: OperationType
  tookMs: number
  status: OperationStatus
}

export enum OperationType {
  GENERATE = 'generate',
  PIPE = 'pipe'
}

export enum OperationStatus {
  SUCCESS = 'success'
}
