import { from, lastValueFrom, tap } from 'rxjs'

import type {
  ValueBag,
  PipeGenericParams,
  CaminhoOptions,
  Loggers,
  Caminho as CaminhoInterface,
  PipeParamsProvides,
  PipeParamsNoProvides,
  BatchParamsProvides,
  BatchParamsNoProvides,
  ParallelStep,
  ParallelResult,
  Provided,
  OpenBag,
  TypedReduceParams,
  ReducedBag,
} from './types'
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

export class Caminho<Bag = ValueBag> implements CaminhoInterface<Bag> {
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

  public pipe<P extends string, V>(params: BatchParamsProvides<Bag, P, V>): Caminho<Provided<Bag, P, V>>
  public pipe(params: BatchParamsNoProvides<Bag>): Caminho<Bag>
  public pipe<P extends string, V>(params: PipeParamsProvides<Bag, P, V>): Caminho<Provided<Bag, P, Awaited<V>>>
  public pipe(params: PipeParamsNoProvides<Bag>): Caminho<Bag>
  public pipe(params: PipeGenericParams): Caminho<ValueBag> {
    const operatorApplier = this.getApplierForPipeOrBatch(params)
    this.addOperatorApplier(() => operatorApplier)
    return this
  }

  public parallel<const Steps extends readonly ParallelStep<Bag>[]>(
    steps: Steps,
  ): Caminho<ParallelResult<Bag, Steps>>

  public parallel(params: PipeGenericParams[]): Caminho<ValueBag> {
    const operatorAppliers: OperatorApplier[] = params.map(this.getApplierForPipeOrBatch)
    const operatorApplier = parallel(params, operatorAppliers)
    this.addOperatorApplier(() => operatorApplier)
    return this
  }

  public filter(params: { fn: (valueBag: OpenBag<Bag>, index: number) => boolean, name?: string }): Caminho<Bag> {
    const loggers = this.getLoggers(params as { name?: string, fn: FilterPredicate })
    this.addOperatorApplier(filter(params.fn as FilterPredicate, loggers, this.pendingDataControl))
    return this
  }

  public reduce<P extends string, A, K extends string = never>(
    reduceParams: TypedReduceParams<Bag, P, A, K>,
  ): Caminho<ReducedBag<Bag, P, A, K>>

  public reduce<T>(reduceParams: ReduceParams<T>): Caminho<ValueBag> {
    const loggers = this.getLoggers(reduceParams)
    this.addOperatorApplier(reduce(reduceParams, loggers, this.pendingDataControl))
    return this
  }

  public async run(initialBag?: ValueBag): Promise<OpenBag<Bag>> {
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
