import type { Observable } from 'rxjs'
import { ValueBag, Operator } from '../../types'

import { BatchParams, BatchParamsProvides } from '../batch'
import { PipeParams, PipeParamsProvides } from '../pipe'

export type OperatorApplier = (observable: Observable<ValueBag>) => Observable<ValueBag>

export function isBatch(params: PipeParams | BatchParams): params is BatchParams {
  return !!(params as BatchParams)?.options?.batch
}

export function pipeHasProvides(params: PipeParams): params is PipeParamsProvides {
  return !!(params as PipeParamsProvides).provides
}

export function batchHasProvides(params: BatchParams): params is BatchParamsProvides {
  return !!(params as BatchParamsProvides).provides
}

export function applyOperator(
  observable: Observable<ValueBag>,
  operatorApplier: OperatorApplier,
): Observable<ValueBag> {
  return operatorApplier(observable)
}

export function applyOperatorsToObservable(
  observable: Observable<ValueBag>,
  operators: Operator[],
): Observable<ValueBag> {
  return operators.reduce((newObservable, operator) => newObservable.pipe(operator), observable)
}
