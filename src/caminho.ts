import { Observable } from 'rxjs'
import { ValueBag, CaminhoOptions, OperationType } from './types'
import { getPromiseState, PromiseState } from './helpers/getPromiseState'

import { source, SourceParams, SourceResult } from './operations/source'
import { pipe, PipeParams } from './operations/pipe'
import { batch, BatchParams } from './operations/batch'

export class Caminho {
  private observable!: Observable<ValueBag>
  private flow: { name: string, type: string }[] = []
  private onSourceFinishPromise: Promise<SourceResult> = new Promise(() => {})
  private pendingDataControl = new Set<number>()

  constructor(private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
  }

  source(sourceParams: SourceParams) {
    this.observable = source(sourceParams, this.onSourceFinish, this.pendingDataControl, this.options)
    this.flow.push({ name: sourceParams.fn.name, type: 'source' })
    return this
  }

  pipe(params: PipeParams | BatchParams) {
    return isBatch(params)
      ? this.batchPipe(params)
      : this.normalPipe(params)
  }

  private normalPipe(params: PipeParams) {
    this.observable = pipe(this.observable, params, this.options)
    this.flow.push({ name: params.fn.name, type: OperationType.PIPE })
    return this
  }

  private batchPipe(params: BatchParams) {
    this.observable = batch(this.observable, params, this.options)
    this.flow.push({ name: params.fn.name, type: OperationType.BATCH })
    return this
  }

  private onSourceFinish(sourceResult: SourceResult) {
    this.onSourceFinishPromise = Promise.resolve(sourceResult)
  }

  async run(): Promise<SourceResult> {
    return new Promise((resolve) => {
      this.flow.push({ name: 'subscribe', type: 'start' })
      this.observable.subscribe(async (valueBag: ValueBag) => {
        const promiseState = await getPromiseState(this.onSourceFinishPromise)
        this.pendingDataControl.delete(valueBag._uniqueId)
        const pendingItemsLength = this.pendingDataControl.size
        if (promiseState === PromiseState.FULFILLED && pendingItemsLength === 0) {
          const sourceResult = await this.onSourceFinishPromise
          resolve(sourceResult)
        }
      })
    })
  }
}

function isBatch(params: PipeParams | BatchParams): params is BatchParams {
  return !!(params as BatchParams)?.options?.batch
}
