import { BatchParams, BatchParamsProvides } from './batch'
import { PipeParams, PipeParamsProvides } from './pipe'

export function isBatch(params: PipeParams | BatchParams): params is BatchParams {
  return !!(params as BatchParams)?.options?.batch
}

export function pipeHasProvides(params: PipeParams): params is PipeParamsProvides {
  return !!(params as PipeParamsProvides).provides
}

export function batchHasProvides(params: BatchParams): params is BatchParamsProvides {
  return !!(params as BatchParamsProvides).provides
}
