import { filter, from, lastValueFrom, reduce, tap } from 'rxjs'

import type { ValueBag, PipeGenericParams, CaminhoOptions, Accumulator } from './types'

import { SourceParams, wrapGenerator, wrapGeneratorWithBackPressure } from './operators/generator'
import { pipe } from './operators/pipe'
import { batch } from './operators/batch'
import { parallel } from './operators/parallel'

import { applyOperator, isBatch, OperatorApplier } from './operators/helpers/operatorHelpers'
import { getLogger } from './utils/stepLogger'
import { PendingDataControlInMemory } from './utils/PendingDataControl'

export class Caminho {
  private generator: (initialBag: ValueBag) => AsyncGenerator<ValueBag>
  private operators: OperatorApplier[] = []
  private finalStep?: OperatorApplier

  constructor(sourceParams: SourceParams, private options?: CaminhoOptions) {
    this.addOperatorApplier = this.addOperatorApplier.bind(this)
    this.getApplierForPipeOrBatch = this.getApplierForPipeOrBatch.bind(this)
    this.run = this.run.bind(this)

    this.generator = this.getGenerator(sourceParams)
  }

  public pipe(params: PipeGenericParams): this {
    const operatorApplier = this.getApplierForPipeOrBatch(params)
    this.addOperatorApplier(operatorApplier)
    return this
  }

  public parallel(params: PipeGenericParams[]): this {
    const operatorAppliers: OperatorApplier[] = params.map(this.getApplierForPipeOrBatch)
    const operatorApplier = parallel(params, operatorAppliers)
    this.addOperatorApplier(operatorApplier)
    return this
  }

  public filter(predicate: (valueBag: ValueBag, index: number) => boolean): this {
    this.addOperatorApplier(filter(predicate))
    return this
  }

  public async run<T = undefined>(initialBag?: ValueBag, resultAggregator?: Accumulator<T>): Promise<T | undefined> {
    const observable$ = this.buildObservable(initialBag)

    if (resultAggregator) {
      const aggregateObservable$ = observable$
        .pipe(reduce(resultAggregator.fn, resultAggregator.seed))

      return lastValueFrom(aggregateObservable$, { defaultValue: resultAggregator.seed })
    }

    await lastValueFrom(observable$, { defaultValue: undefined })
    return undefined
  }

  private getGenerator(sourceParams: SourceParams): (initialBag: ValueBag) => AsyncGenerator<ValueBag> {
    const logger = this.getLogger(sourceParams)
    if (this.options?.maxItemsFlowing) {
      const pendingDataControl = new PendingDataControlInMemory()
      this.finalStep = tap(() => pendingDataControl.decrement())
      return wrapGeneratorWithBackPressure(sourceParams, this.options.maxItemsFlowing, pendingDataControl, logger)
    }

    return wrapGenerator(sourceParams, logger)
  }

  private buildObservable(initialBag: ValueBag = {}) {
    const initialObservable$ = from(this.generator({ ...initialBag }))
    const observable$ = this.operators.reduce(applyOperator, initialObservable$)

    if (this.finalStep) {
      return observable$
        .pipe(this.finalStep)
    }

    return observable$
  }

  private addOperatorApplier(operatorApplier: OperatorApplier) {
    this.operators.push(operatorApplier)
  }

  private getApplierForPipeOrBatch(params: PipeGenericParams): OperatorApplier {
    return isBatch(params)
      ? batch(params, this.getLogger(params))
      : pipe(params, this.getLogger(params))
  }

  private getLogger(params: SourceParams | PipeGenericParams) {
    const name = params.name ?? params.fn.name
    return getLogger(name, this.options?.onEachStep)
  }
}
