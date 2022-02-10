import { from, lastValueFrom, map, mergeMap, Observable, reduce, share, tap, zip } from 'rxjs'
import { ValueBag, OperationType, PipeGenericParams, OnEachStep } from './types'

import { SourceParams, SourceResult, wrapGenerator } from './operations/generator'
import { pipe, PipeParams } from './operations/pipe'
import { batch, BatchParams } from './operations/batch'
import { isBatch } from './operations/operationDiscrimator'
import { buildValueBagAccumulator, getNewValueBag } from './operations/valueBag'
import { getLogger } from './operations/stepLogger'
import { PendingDataControlInMemory } from './PendingDataControl'

export interface CaminhoOptions {
  onEachStep?: OnEachStep
}

export interface Accumulator<A> {
  fn: (acc: A, value: ValueBag, index: number) => A,
  seed: A,
  provides: string
}

export class Caminho {
  private observable!: Observable<ValueBag>
  private pendingDataControl = new PendingDataControlInMemory()
  private sourceResult: SourceResult | null = null

  constructor(private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
    this.getObservableForPipe = this.getObservableForPipe.bind(this)
  }

  source(sourceParams: SourceParams, initialBag:ValueBag = {}): Caminho {
    const generator = this.getGenerator(sourceParams)
    this.observable = from(generator(initialBag))
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

  subFlow<T>(
    sourceParams: SourceParams,
    submitSubFlow: (newFlow: Caminho) => Caminho,
    accumulator: Accumulator<T>,
    maxConcurrency?: number,
  ): Caminho {
    const { options } = this

    function getChildFlow(parentItem: ValueBag) {
      const subCaminho = new Caminho(options)
      subCaminho.source(sourceParams, parentItem)
      submitSubFlow(subCaminho)
      subCaminho.appendFinalStep()

      return subCaminho.observable
        .pipe(reduce(accumulator.fn, accumulator.seed))
        .pipe(map((accumulated) => getNewValueBag(parentItem, accumulator.provides, accumulated)))
    }

    this.observable = this.observable
      .pipe(mergeMap((parentData) => lastValueFrom(getChildFlow(parentData)), maxConcurrency))

    return this
  }

  async run(): Promise<SourceResult> {
    this.appendFinalStep()
    return new Promise((resolve) => {
      this.observable
        .subscribe(() => {
          if (this.hasFinished(this.sourceResult)) {
            resolve(this.sourceResult as SourceResult)
          }
        })
    })
  }

  private hasFinished(sourceResult: SourceResult | null): boolean {
    return sourceResult !== null && this.pendingDataControl.size === 0
  }

  private getGenerator(sourceParams: SourceParams) {
    const logger = getLogger(OperationType.GENERATE, sourceParams.fn, this.options?.onEachStep)
    return wrapGenerator(sourceParams, this.onSourceFinish, this.pendingDataControl, logger)
  }

  private appendFinalStep() {
    this.observable = this.observable.pipe(tap(() => this.pendingDataControl.decrement()))
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
}
