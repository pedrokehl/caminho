import type { Observable } from 'rxjs'
import { ValueBag } from '../../types'

import { BatchParams } from '../batch'
import { PipeParams } from '../pipe'

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
