import type { Observable } from 'rxjs'
import { type ValueBag } from '../../types'

import { type BatchParams } from '../batch'
import { type PipeParams } from '../pipe'

export type OperatorApplier = (observable: Observable<ValueBag>) => Observable<ValueBag>
export type OperatorApplierWithRunId = (runId: string) => OperatorApplier

export function isBatch(params: PipeParams | BatchParams): params is BatchParams {
  return !!(params as BatchParams)?.batch
}

export function applyOperator(
  observable: Observable<ValueBag>,
  operatorApplier: OperatorApplierWithRunId,
  runId: string,
): Observable<ValueBag> {
  return operatorApplier(runId)(observable)
}
