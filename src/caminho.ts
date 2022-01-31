import { from, map, Observable, share, zip } from 'rxjs'
import { ValueBag, OperationType, PipeGenericParams, OnEachStep } from './types'
import { generateId } from './helpers/random'

import { SourceParams, SourceResult, wrapGenerator } from './operations/generator'
import { pipe, PipeParams } from './operations/pipe'
import { batch, BatchParams } from './operations/batch'
import { isBatch } from './operations/operationDiscrimator'
import { buildValueBagAccumulator } from './operations/valueBag'
import { getLogger } from './operations/stepLogger'

export interface CaminhoOptions {
  onEachStep?: OnEachStep
}

export class Caminho {
  private flowId = generateId()
  private observable!: Observable<ValueBag>
  private pendingDataControl = new Set<number>()
  private sourceResult: SourceResult | null = null

  constructor(private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
    this.getObservableForPipe = this.getObservableForPipe.bind(this)
  }

  source(sourceParams: SourceParams): Caminho {
    const logger = getLogger(OperationType.GENERATE, sourceParams.fn, this.options?.onEachStep)
    const wrappedGenerator = wrapGenerator(
      sourceParams,
      this.onSourceFinish,
      this.pendingDataControl,
      this.flowId,
      logger,
    )
    this.observable = from(wrappedGenerator({}))
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

  private getObservableForPipe(params: PipeGenericParams): Observable<ValueBag> {
    return isBatch(params)
      ? this.batchPipe(params)
      : this.normalPipe(params)
  }

  private normalPipe(params: PipeParams): Observable<ValueBag> {
    const logger = getLogger(OperationType.PIPE, params.fn, this.options?.onEachStep)
    return pipe(this.observable, params, logger)
  }

  private batchPipe(params: BatchParams): Observable<ValueBag> {
    const logger = getLogger(OperationType.BATCH, params.fn, this.options?.onEachStep)
    return batch(this.observable, params, logger)
  }

  private onSourceFinish(sourceResult: SourceResult): void {
    this.sourceResult = sourceResult
  }

  async run(): Promise<SourceResult> {
    return new Promise((resolve) => {
      this.observable.subscribe((valueBag: ValueBag) => {
        this.pendingDataControl.delete(valueBag[this.flowId])

        if (this.sourceResult && this.pendingDataControl.size === 0) {
          resolve(this.sourceResult)
        }
      })
    })
  }
}
