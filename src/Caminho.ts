import { from, lastValueFrom, tap } from 'rxjs'

import type { ValueBag, PipeGenericParams, CaminhoOptions, Loggers } from './types'

import { GeneratorParams, wrapGenerator, wrapGeneratorWithBackPressure } from './operators/generator'
import { pipe } from './operators/pipe'
import { batch } from './operators/batch'
import { parallel } from './operators/parallel'
import { reduce, ReduceParams } from './operators/reduce'
import { filter, FilterPredicate } from './operators/filter'

import { applyOperator, isBatch, OperatorApplier } from './operators/helpers/operatorHelpers'
import { PendingDataControl, PendingDataControlInMemory } from './utils/PendingDataControl'

import { getOnStepFinished } from './utils/onStepFinished'
import { getOnStepStarted } from './utils/onStepStarted'
import { pick } from './utils/pick'

export class Caminho {
  private generator: (initialBag: ValueBag) => AsyncGenerator<ValueBag>
  private operators: OperatorApplier[] = []
  private finalStep?: OperatorApplier
  private pendingDataControl?: PendingDataControl

  constructor(generatorParams: GeneratorParams, private options?: CaminhoOptions) {
    this.addOperatorApplier = this.addOperatorApplier.bind(this)
    this.getApplierForPipeOrBatch = this.getApplierForPipeOrBatch.bind(this)
    this.run = this.run.bind(this)

    if (options?.maxItemsFlowing) {
      this.pendingDataControl = new PendingDataControlInMemory()
    }

    this.generator = this.getGenerator(generatorParams)
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

  public filter(predicate: FilterPredicate): this {
    this.addOperatorApplier(filter(predicate, this.pendingDataControl))
    return this
  }

  public reduce<T>(reduceParams: ReduceParams<T>): this {
    const loggers = this.getLoggers(reduceParams)
    this.addOperatorApplier(reduce(reduceParams, loggers, this.pendingDataControl))
    return this
  }

  public run(initialBag: ValueBag, pickLastValues: string[]): Promise<unknown>
  public run(initialBag?: ValueBag): Promise<undefined>
  public async run(initialBag?: ValueBag, pickLastValues?: string[]): Promise<unknown | undefined> {
    const observable$ = this.buildObservable(initialBag)
    const lastValue = await lastValueFrom(observable$, { defaultValue: undefined })
    return pickLastValues && lastValue ? pick(lastValue, pickLastValues) : undefined
  }

  private getGenerator(generatorParams: GeneratorParams): (initialBag: ValueBag) => AsyncGenerator<ValueBag> {
    const loggers = this.getLoggers(generatorParams)
    if (this.options?.maxItemsFlowing) {
      const pendingDataControl = this.pendingDataControl as PendingDataControl
      this.finalStep = tap(() => pendingDataControl.decrement())
      return wrapGeneratorWithBackPressure(generatorParams, this.options.maxItemsFlowing, pendingDataControl, loggers)
    }

    return wrapGenerator(generatorParams, loggers)
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
      ? batch(params, this.getLoggers(params))
      : pipe(params, this.getLoggers(params))
  }

  private getLoggers<T>(params: GeneratorParams | PipeGenericParams | ReduceParams<T>): Loggers {
    const stepName = params.name ?? params.fn.name
    const onStepStarted = getOnStepStarted(stepName, this.options?.onStepStarted)
    const onStepFinished = getOnStepFinished(stepName, this.options?.onStepFinished)
    return { onStepFinished, onStepStarted }
  }
}
