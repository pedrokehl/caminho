import type { Observable } from 'rxjs'
import { type ValueBag } from '../../types'

import { type BatchParams } from '../batch'
import { type PipeParams } from '../pipe'

export type OperatorApplier = (observable: Observable<ValueBag>) => Observable<ValueBag>

export function isBatch(params: PipeParams | BatchParams): params is BatchParams {
  return !!(params as BatchParams)?.batch
}

export function applyOperator(
  observable: Observable<ValueBag>,
  operatorApplier: OperatorApplier,
): Observable<ValueBag> {
  return operatorApplier(observable)
}
