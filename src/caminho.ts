import { map, Observable, share, zip } from 'rxjs'
import { ValueBag, CaminhoOptions, OperationType, PipeGenericParams } from './types'
import { getPromiseState, PromiseState } from './helpers/getPromiseState'

import { source, SourceParams, SourceResult } from './operations/source'
import { pipe, PipeParams } from './operations/pipe'
import { batch, BatchParams } from './operations/batch'
import { isBatch } from './operations/operationDiscrimator'
import { buildValueBagAccumulator } from './operations/valueBag'

export class Caminho {
  private observable!: Observable<ValueBag>
  private flow: { name: string, type: string }[] = []
  private onSourceFinishPromise: Promise<SourceResult> = new Promise(() => {})
  private pendingDataControl = new Set<number>()

  constructor(private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
    this.getObservableForPipe = this.getObservableForPipe.bind(this)
  }

  source(sourceParams: SourceParams): Caminho {
    this.observable = source(sourceParams, this.onSourceFinish, this.pendingDataControl, this.options)
    this.flow.push({ name: sourceParams.fn.name, type: 'source' })
    return this
  }

  pipe(params: PipeGenericParams): Caminho {
    this.observable = this.getObservableForPipe(params)
    return this
  }

  parallel(params: PipeGenericParams[]): Caminho {
    this.observable = this.observable.pipe(share())
    const observables = params.map(this.getObservableForPipe)
    this.observable = zip(observables).pipe(map(buildValueBagAccumulator(params)))
    return this
  }

  getObservableForPipe(params: PipeGenericParams): Observable<ValueBag> {
    return isBatch(params)
      ? this.batchPipe(params)
      : this.normalPipe(params)
  }

  private normalPipe(params: PipeParams): Observable<ValueBag> {
    this.flow.push({ name: params.fn.name, type: OperationType.PIPE })
    return pipe(this.observable, params, this.options)
  }

  private batchPipe(params: BatchParams): Observable<ValueBag> {
    this.flow.push({ name: params.fn.name, type: OperationType.BATCH })
    return batch(this.observable, params, this.options)
  }

  private onSourceFinish(sourceResult: SourceResult): void {
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
