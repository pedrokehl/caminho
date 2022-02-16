import { from, last, lastValueFrom, map, mergeMap, reduce, tap } from 'rxjs'
import type { ValueBag, PipeGenericParams, CaminhoRunStats, CaminhoOptions, Accumulator } from './types'

import { SourceParams, wrapGenerator } from './operators/generator'
import { pipe } from './operators/pipe'
import { batch } from './operators/batch'
import { parallel } from './operators/parallel'

import { applyOperator, isBatch, OperatorApplier } from './operators/helpers/operatorHelpers'
import { getNewValueBag } from './utils/valueBag'
import { getLogger } from './utils/stepLogger'
import { PendingDataControlInMemory } from './utils/PendingDataControl'
import { OperationType } from './types'

export class Caminho {
  private pendingDataControl = new PendingDataControlInMemory()
  private runStats: CaminhoRunStats | null = null

  private generator!: (initialBag: ValueBag) => AsyncGenerator<ValueBag>
  private operators: OperatorApplier[] = []
  private finalStep = tap(() => this.pendingDataControl.decrement())

  constructor(sourceOptions: SourceParams, private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
    this.addOperatorApplier = this.addOperatorApplier.bind(this)
    this.getApplierForPipeOrBatch = this.getApplierForPipeOrBatch.bind(this)

    this.source(sourceOptions)
  }

  public pipe(params: PipeGenericParams): Caminho {
    const operatorApplier = this.getApplierForPipeOrBatch(params)
    this.addOperatorApplier(operatorApplier)
    return this
  }

  public parallel(params: PipeGenericParams[]): Caminho {
    const operatorAppliers: OperatorApplier[] = params.map(this.getApplierForPipeOrBatch)
    const operatorApplier = parallel(params, operatorAppliers)
    this.addOperatorApplier(operatorApplier)
    return this
  }

  public subFlow<T>(
    subCaminho: Caminho,
    accumulator?: Accumulator<T>,
    maxConcurrency?: number,
  ): Caminho {
    subCaminho.addOperatorApplier(subCaminho.finalStep as OperatorApplier)

    const aggregator = accumulator
      ? reduce(accumulator.fn, accumulator.seed)
      : last<ValueBag>()

    subCaminho.addOperatorApplier(aggregator)

    const parentItemMapper = accumulator
      ? (parentItem: ValueBag, child: ValueBag) => getNewValueBag(parentItem, accumulator.provides, child)
      : (parentItem: ValueBag) => parentItem

    function applyChildFlow(parentItem: ValueBag): Promise<ValueBag> {
      return lastValueFrom(
        subCaminho.buildObservable(parentItem)
          .pipe(map((child: ValueBag) => parentItemMapper(parentItem, child))),
      )
    }

    this.addOperatorApplier(mergeMap(applyChildFlow, maxConcurrency))
    return this
  }

  public async run(initialBag: ValueBag = {}): Promise<CaminhoRunStats> {
    return new Promise((resolve) => {
      this.buildObservable(initialBag)
        .pipe(this.finalStep)
        .subscribe(() => {
          if (this.hasFinished(this.runStats)) {
            resolve(this.runStats as CaminhoRunStats)
          }
        })
    })
  }

  private source(sourceParams: SourceParams): Caminho {
    const name = sourceParams.name ?? sourceParams.fn.name
    const logger = getLogger(OperationType.GENERATE, name, this.options?.onEachStep)
    this.generator = wrapGenerator(sourceParams, this.onSourceFinish, this.pendingDataControl, logger)
    return this
  }

  private buildObservable(initialBag: ValueBag) {
    const initialObservable = from(this.generator(initialBag))
    return this.operators.reduce(applyOperator, initialObservable)
  }

  private hasFinished(runStats: CaminhoRunStats | null): boolean {
    return runStats !== null && this.pendingDataControl.size === 0
  }

  private addOperatorApplier(operatorApplier: OperatorApplier) {
    this.operators.push(operatorApplier)
  }

  private getApplierForPipeOrBatch(params: PipeGenericParams): OperatorApplier {
    const name = params.name ?? params.fn.name

    return isBatch(params)
      ? batch(params, getLogger(OperationType.BATCH, name, this.options?.onEachStep))
      : pipe(params, getLogger(OperationType.PIPE, name, this.options?.onEachStep))
  }

  private onSourceFinish(runStats: CaminhoRunStats): void {
    this.runStats = runStats
  }
}
