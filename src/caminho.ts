import { from, lastValueFrom, map, mergeMap, Observable, reduce, share, tap, zip } from 'rxjs'
import { ValueBag, OperationType, PipeGenericParams, OnEachStep, Operator, OperatorApplier } from './types'

import { SourceParams, SourceResult, wrapGenerator } from './operations/generator'
import { pipe } from './operations/pipe'
import { batch } from './operations/batch'
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
  private pendingDataControl = new PendingDataControlInMemory()
  private sourceResult: SourceResult | null = null

  private generator!: (initialBag: ValueBag) => AsyncGenerator<ValueBag>
  private operators: OperatorApplier[] = []
  private finalStep = tap(() => this.pendingDataControl.decrement())

  constructor(private options?: CaminhoOptions) {
    this.onSourceFinish = this.onSourceFinish.bind(this)
    this.appendOperator = this.appendOperator.bind(this)
    this.getOperatorsForPipe = this.getOperatorsForPipe.bind(this)
  }

  source(sourceParams: SourceParams): Caminho {
    this.generator = this.getGenerator(sourceParams)
    return this
  }

  pipe(params: PipeGenericParams): Caminho {
    const operators = this.getOperatorsForPipe(params)
    operators.forEach(this.appendOperator)
    return this
  }

  parallel(params: PipeGenericParams[]): Caminho {
    this.appendOperator(share())
    const operatorsGroups: Operator[][] = params.map(this.getOperatorsForPipe)
    function parallelOperatorsApplier(observable: Observable<ValueBag>) {
      return zip(operatorsGroups.map((operators) => applyOperatorsToObservable(observable, operators)))
    }
    this.operators.push(parallelOperatorsApplier)
    this.appendOperator(map(buildValueBagAccumulator(params)) as Operator)
    return this
  }

  subFlow<T>(
    submitSubFlow: (newFlow: Caminho) => Caminho,
    accumulator: Accumulator<T>,
    maxConcurrency?: number,
  ): Caminho {
    const { options } = this

    const subCaminho = new Caminho(options)
    submitSubFlow(subCaminho)
    subCaminho.appendOperator(subCaminho.finalStep as Operator)
    subCaminho.appendOperator(reduce(accumulator.fn, accumulator.seed))

    function applyChildFlow(parentItem: ValueBag): Promise<ValueBag> {
      return lastValueFrom(
        subCaminho.buildObservable(parentItem)
          .pipe(map((accumulated) => getNewValueBag(parentItem, accumulator.provides, accumulated))),
      )
    }

    this.appendOperator(mergeMap(applyChildFlow, maxConcurrency))
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

  private getGenerator(sourceParams: SourceParams) {
    const name = sourceParams.name ?? sourceParams.fn.name
    const logger = getLogger(OperationType.GENERATE, name, this.options?.onEachStep)
    return wrapGenerator(sourceParams, this.onSourceFinish, this.pendingDataControl, logger)
  }

  private appendOperator(operator: Operator) {
    this.operators.push(buildOperatorApplier(operator))
  }

  private getOperatorsForPipe(params: PipeGenericParams): Operator[] {
    const name = params.name ?? params.fn.name

    return isBatch(params)
      ? batch(params, getLogger(OperationType.BATCH, name, this.options?.onEachStep))
      : pipe(params, getLogger(OperationType.PIPE, name, this.options?.onEachStep))
  }

  private onSourceFinish(sourceResult: SourceResult): void {
    this.sourceResult = sourceResult
  }
}

function applyOperator(observable: Observable<ValueBag>, operatorApplier: OperatorApplier): Observable<ValueBag> {
  return operatorApplier(observable)
}

function buildOperatorApplier(operator: Operator): OperatorApplier {
  return function operatorApplier(observable: Observable<ValueBag>) {
    return observable.pipe(operator)
  }
}

function applyOperatorsToObservable(observable: Observable<ValueBag>, operators: Operator[]): Observable<ValueBag> {
  return operators.reduce((newObservable, operator) => newObservable.pipe(operator), observable)
}
