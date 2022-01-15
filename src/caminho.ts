import {
  bufferTime, filter, mergeAll, Observable,
} from 'rxjs'
import { GeneratorParams, OperationType, PipeParams } from './operations/operations'
import { generate } from './operations/generate'
import { pipe } from './operations/pipe'
import type { ValueBag, CaminhoOptions } from './types'
import { getPromiseState, PromiseState } from './helpers/getPromiseState'

export class Caminho {
  private observable!: Observable<ValueBag>
  private flow: { name: string, type: string }[] = []
  private onGeneratorFinishPromise = new Promise(() => {})
  private pendingDataControl = new Set<number>()

  constructor(private options?: CaminhoOptions) {
    this.onGeneratorFinish = this.onGeneratorFinish.bind(this)
  }

  source(generatorParams: GeneratorParams) {
    this.observable = generate(generatorParams, this.onGeneratorFinish, this.pendingDataControl, this.options)
    this.flow.push({ name: generatorParams.fn.name, type: 'source' })
    return this
  }

  pipe(params: PipeParams) {
    if (params.options?.batch) {
      this.timerBatch(params.options.batch.timeoutMs, params.options.batch.maxSize)
      this.observable = this.appendOperator(params)
      this.flatten()
      return this
    }
    this.observable = this.appendOperator(params)
    return this
  }

  private appendOperator(params: PipeParams) {
    this.flow.push({ name: params.fn.name, type: OperationType.PIPE })
    return pipe(this.observable, params, this.options)
  }

  private onGeneratorFinish(generatorResult: { emitted: number }) {
    this.onGeneratorFinishPromise = Promise.resolve({ generatorResult })
  }

  timerBatch(timeoutMs: number, maxSize: number) {
    this.flow.push({ name: `timeoutMs: ${timeoutMs} - maxSize: ${maxSize}`, type: 'timerBatch' })
    this.observable = this.observable.pipe(
      bufferTime(timeoutMs, undefined, maxSize),
      filter((buffer) => buffer.length > 0),
    )
    return this
  }

  flatten() {
    this.flow.push({ name: 'mergeAll', type: 'flatten' })
    this.observable = this.observable.pipe(mergeAll())
    return this
  }

  async run() {
    return new Promise((resolve) => {
      this.flow.push({ name: 'subscribe', type: 'start' })
      this.observable.subscribe(async (valueBag: ValueBag) => {
        const promiseState = await getPromiseState(this.onGeneratorFinishPromise)
        this.pendingDataControl.delete(valueBag._uniqueId)
        const pendingItemsLength = this.pendingDataControl.size
        if (promiseState === PromiseState.FULFILLED && pendingItemsLength === 0) {
          const generatorResult = await this.onGeneratorFinishPromise
          resolve(generatorResult)
        }
      })
    })
  }
}
