import { from, lastValueFrom, tap } from 'rxjs'

import type { ValueBag, PipeGenericParams, CaminhoOptions, Loggers, Caminho as CaminhoInterface } from './types'
import type { FromGeneratorParams } from './from'

import { wrapGenerator, wrapGeneratorWithBackPressure } from './operators/generator'
import { pipe } from './operators/pipe'
import { batch } from './operators/batch'
import { parallel } from './operators/parallel'
import { reduce, type ReduceParams } from './operators/reduce'
import { filter, type FilterPredicate } from './operators/filter'

import {
  applyOperator,
  isBatch,
  type OperatorApplier,
  type OperatorApplierWithRunId,
} from './operators/helpers/operatorHelpers'
import { type PendingDataControl, PendingDataControlInMemory } from './utils/PendingDataControl'

import { getOnStepFinished } from './utils/onStepFinished'
import { getOnStepStarted } from './utils/onStepStarted'
import { generateId } from './utils/generateId'

type Generator = (initialBag: ValueBag, runId: string) => AsyncGenerator<ValueBag>

export class Caminho implements CaminhoInterface {
  private generator: Generator
  private operators: OperatorApplierWithRunId[] = []
  private pendingDataControl?: PendingDataControl

  constructor(generatorParams: FromGeneratorParams, private options?: CaminhoOptions) {
    this.addOperatorApplier = this.addOperatorApplier.bind(this)
    this.getApplierForPipeOrBatch = this.getApplierForPipeOrBatch.bind(this)
    this.run = this.run.bind(this)

    if (options?.maxItemsFlowing) {
      this.pendingDataControl = new PendingDataControlInMemory()
    }

    this.generator = this.getGenerator(generatorParams)
  }

  public getNumberOfItemsFlowing(): number | undefined {
    return this.pendingDataControl?.size
  }

  public pipe(params: PipeGenericParams): this {
    const operatorApplier = this.getApplierForPipeOrBatch(params)
    this.addOperatorApplier(() => operatorApplier)
    return this
  }

  public parallel(params: PipeGenericParams[]): this {
    const operatorAppliers: OperatorApplier[] = params.map(this.getApplierForPipeOrBatch)
    const operatorApplier = parallel(params, operatorAppliers)
    this.addOperatorApplier(() => operatorApplier)
    return this
  }

  public filter(params: { fn: FilterPredicate, name?: string }): this {
    const loggers = this.getLoggers(params)
    this.addOperatorApplier(filter(params.fn, loggers, this.pendingDataControl))
    return this
  }

  public reduce<T>(reduceParams: ReduceParams<T>): this {
    const loggers = this.getLoggers(reduceParams)
    this.addOperatorApplier(reduce(reduceParams, loggers, this.pendingDataControl))
    return this
  }

  public async run(initialBag?: ValueBag): Promise<ValueBag> {
    const runId = generateId()
    const initial$ = from(this.generator({ ...initialBag }, runId))
    const observable$ = this.operators.reduce((acc, operator) => applyOperator(acc, operator, runId), initial$)

    const finalObservable$ = this.options?.maxItemsFlowing
      ? observable$.pipe(tap(() => (this.pendingDataControl as PendingDataControl).decrement(runId)))
      : observable$

    try {
      return await lastValueFrom(finalObservable$, { defaultValue: initialBag })
    } finally {
      this.pendingDataControl?.destroyBucket(runId)
    }
  }

  private getGenerator(generatorParams: FromGeneratorParams): Generator {
    const loggers = this.getLoggers(generatorParams)
    if (this.options?.maxItemsFlowing) {
      const pendingDataControl = this.pendingDataControl as PendingDataControl
      return wrapGeneratorWithBackPressure(generatorParams, this.options.maxItemsFlowing, pendingDataControl, loggers)
    }

    return wrapGenerator(generatorParams, loggers)
  }

  private addOperatorApplier(operatorApplier: OperatorApplierWithRunId) {
    this.operators.push(operatorApplier)
  }

  private getApplierForPipeOrBatch(params: PipeGenericParams): OperatorApplier {
    return isBatch(params)
      ? batch(params, this.getLoggers(params))
      : pipe(params, this.getLoggers(params))
  }

  private getLoggers(params: { name?: string, fn: { name: string } }): Loggers {
    const stepName = params.name ?? params.fn.name
    const onStepStarted = getOnStepStarted(stepName, this.options?.onStepStarted)
    const onStepFinished = getOnStepFinished(stepName, this.options?.onStepFinished)
    return { onStepFinished, onStepStarted }
  }
}
