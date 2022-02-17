import { from, mergeMap, tap } from 'rxjs'

import type { ValueBag, PipeGenericParams, CaminhoOptions, Operator } from '../types'
import { OperationType } from '../types'

import { SourceParams, wrapGenerator } from '../operators/generator'
import { pipe } from '../operators/pipe'
import { batch } from '../operators/batch'
import { parallel } from '../operators/parallel'

import { applyOperator, isBatch, OperatorApplier } from '../operators/helpers/operatorHelpers'
import { getLogger } from '../utils/stepLogger'
import { PendingDataControlInMemory } from '../utils/PendingDataControl'

import { Caminho } from '../interfaces/Caminho'
import { SubCaminho } from '../interfaces/SubCaminho'

export abstract class CaminhoAbstract implements Caminho {
  protected pendingDataControl = new PendingDataControlInMemory()
  private generator!: (initialBag: ValueBag) => AsyncGenerator<ValueBag>
  private operators: OperatorApplier[] = []
  protected finalStep: Operator = tap(() => this.pendingDataControl.decrement())

  constructor(sourceOptions: SourceParams, protected options?: CaminhoOptions) {
    this.addOperatorApplier = this.addOperatorApplier.bind(this)
    this.getApplierForPipeOrBatch = this.getApplierForPipeOrBatch.bind(this)

    this.source(sourceOptions)
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

  public subFlow(
    submitSubFlow: (from: (sourceParams: SourceParams) => SubCaminho) => SubCaminho,
    maxConcurrency?: number,
  ): this {
    const subCaminho = submitSubFlow(this.subCaminhoFrom)
    this.addOperatorApplier(mergeMap(subCaminho.run, maxConcurrency))
    return this
  }

  private source(sourceParams: SourceParams): Caminho {
    const name = sourceParams.name ?? sourceParams.fn.name
    const logger = getLogger(OperationType.GENERATE, name, this.options?.onEachStep)
    this.generator = wrapGenerator(sourceParams, this.pendingDataControl, logger)
    return this
  }

  protected buildObservable(initialBag: ValueBag) {
    const initialObservable = from(this.generator({ ...initialBag }))
    return this.operators.reduce(applyOperator, initialObservable)
  }

  protected addOperatorApplier(operatorApplier: OperatorApplier) {
    this.operators.push(operatorApplier)
  }

  private getApplierForPipeOrBatch(params: PipeGenericParams): OperatorApplier {
    const name = params.name ?? params.fn.name

    return isBatch(params)
      ? batch(params, getLogger(OperationType.BATCH, name, this.options?.onEachStep))
      : pipe(params, getLogger(OperationType.PIPE, name, this.options?.onEachStep))
  }

  protected subCaminhoFrom(sourceParams: SourceParams): SubCaminho {
    throw new Error(`Not implemented, called subCaminho for ${sourceParams.provides}`)
  }
}
