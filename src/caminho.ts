import { from, lastValueFrom, map, mergeMap, reduce, tap } from 'rxjs'
import type { ValueBag, PipeGenericParams, OnEachStep, OperatorApplier } from './types'

import { SourceParams, SourceResult, wrapGenerator } from './operators/generator'
import { pipe } from './operators/pipe'
import { batch } from './operators/batch'
import { parallel } from './operators/parallel'

import { applyOperator, isBatch } from './operators/helpers/operatorHelpers'
import { getNewValueBag } from './utils/valueBag'
import { getLogger } from './utils/stepLogger'
import { PendingDataControlInMemory } from './utils/PendingDataControl'
import { OperationType } from './types'

export interface CaminhoOptions {
  onEachStep?: OnEachStep
}

export interface Accumulator<A> {
  fn: (acc: A, value: ValueBag, index: number) => A,
  seed: A,
  provides: string
}

export class Caminho {
  private pendingDataControl = new PendingDataControlInMemory()
  private sourceResult: SourceResult | null = null

  private generator!: (initialBag: ValueBag) => AsyncGenerator<ValueBag>
  private operators: OperatorApplier[] = []
  private finalStep = tap(() => this.pendingDataControl.decrement())

  constructor(private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
    this.addOperatorApplier = this.addOperatorApplier.bind(this)
    this.getApplierForPipeOrBatch = this.getApplierForPipeOrBatch.bind(this)
  }

  source(sourceParams: SourceParams): Caminho {
    const name = sourceParams.name ?? sourceParams.fn.name
    const logger = getLogger(OperationType.GENERATE, name, this.options?.onEachStep)
    this.generator = wrapGenerator(sourceParams, this.onSourceFinish, this.pendingDataControl, logger)
    return this
  }

  pipe(params: PipeGenericParams): Caminho {
    const operatorApplier = this.getApplierForPipeOrBatch(params)
    this.addOperatorApplier(operatorApplier)
    return this
  }

  parallel(params: PipeGenericParams[]): Caminho {
    const operatorAppliers: OperatorApplier[] = params.map(this.getApplierForPipeOrBatch)
    const operatorApplier = parallel(params, operatorAppliers)
    this.addOperatorApplier(operatorApplier)
    return this
  }

  subFlow<T>(
    submitSubFlow: (newFlow: Caminho) => Caminho,
    accumulator: Accumulator<T>,
    maxConcurrency?: number,
  ): Caminho {
    const subCaminho = new Caminho(this.options)
    submitSubFlow(subCaminho)
    subCaminho.addOperatorApplier(subCaminho.finalStep as OperatorApplier)
    subCaminho.addOperatorApplier(reduce(accumulator.fn, accumulator.seed))

    function applyChildFlow(parentItem: ValueBag): Promise<ValueBag> {
      return lastValueFrom(
        subCaminho.buildObservable(parentItem)
          .pipe(map((accumulated) => getNewValueBag(parentItem, accumulator.provides, accumulated))),
      )
    }

    this.addOperatorApplier(mergeMap(applyChildFlow, maxConcurrency))
    return this
  }

  async run(initialBag: ValueBag = {}): Promise<SourceResult> {
    return new Promise((resolve) => {
      this.buildObservable(initialBag)
        .pipe(this.finalStep)
        .subscribe(() => {
          if (this.hasFinished(this.sourceResult)) {
            resolve(this.sourceResult as SourceResult)
          }
        })
    })
  }

  private buildObservable(initialBag: ValueBag) {
    const initialObservable = from(this.generator(initialBag))
    return this.operators.reduce(applyOperator, initialObservable)
  }

  private hasFinished(sourceResult: SourceResult | null): boolean {
    return sourceResult !== null && this.pendingDataControl.size === 0
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

  private onSourceFinish(sourceResult: SourceResult): void {
    this.sourceResult = sourceResult
  }
}
