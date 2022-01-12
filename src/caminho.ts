import {
  bufferTime, filter, mergeAll, Observable,
} from 'rxjs'
import { generate } from './operations/generate'
import { pipe, OperationType } from './operations/pipe'
import type {
  CaminhoGenerator, ValueBag, OperatorProviderParams, OperatorParams,
} from './types'

// TODO: add onEachStep logOption
// TODO: add onSourceFinish logOption
export class Caminho {
  private observable!: Observable<ValueBag>
  private flow: { name: string, type: string }[] = []

  source(params: { fn: CaminhoGenerator, provides: string }) {
    this.observable = generate(params.fn, params.provides)
    this.flow.push({ name: params.fn.name, type: 'source' })
    return this
  }

  fetch(params: OperatorProviderParams) {
    return this.appendOperatorWithOptions(params, OperationType.FETCH)
  }

  map(params: OperatorProviderParams) {
    return this.appendOperatorWithOptions(params, OperationType.MAP)
  }

  save(params: OperatorParams) {
    return this.appendOperatorWithOptions(params, OperationType.SAVE)
  }

  private appendOperatorWithOptions(params: OperatorParams, operation: OperationType) {
    if (params.options?.batch) {
      this.timerBatch(params.options.batch.timeoutMs, params.options.batch.maxSize)
      this.observable = this.appendOperator(params, operation)
      this.flatten()
      return this
    }
    this.observable = this.appendOperator(params, operation)
    return this
  }

  private appendOperator(params: OperatorParams, operation: OperationType) {
    this.flow.push({ name: params.fn.name, type: operation })
    return pipe(this.observable, operation, params)
  }

  timerBatch(timeoutMs: number, maxSize: number) {
    this.flow.push({ name: `timeoutMs: ${timeoutMs} - maxSize: ${maxSize}`, type: 'timerBatch' })
    this.observable = this.observable.pipe(
      bufferTime(timeoutMs, undefined, maxSize),
      filter((buffer) => buffer.length > 0),
    )
    return this
  }

  flatten() {
    this.flow.push({ name: 'mergeAll', type: 'flatten' })
    this.observable = this.observable.pipe(mergeAll())
    return this
  }

  async start() {
    this.flow.push({ name: 'subscribe', type: 'start' })
    this.observable.subscribe()
  }
}
