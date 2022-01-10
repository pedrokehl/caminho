import {
  bufferCount, bufferTime, mergeAll, Observable,
} from 'rxjs'
import { generate } from './operations/generate'
import { pipe, OperationType } from './operations/pipe'
import { CaminhoMapper, CaminhoGenerator, ValueBag } from './types'

// TODO: add onEachStep logOption
// TODO: add onSourceFinish logOption
export class Caminho {
  private observable!: Observable<ValueBag>

  source(generator: CaminhoGenerator, provides: string) {
    this.observable = generate(generator, provides)
    return this
  }

  fetch(fetchFunction: CaminhoMapper, provides: string) {
    this.observable = pipe(this.observable, fetchFunction, OperationType.FETCH, provides)
    return this
  }

  map(mapFunction: CaminhoMapper, provides: string) {
    this.observable = pipe(this.observable, mapFunction, OperationType.MAP, provides)
    return this
  }

  save(saveFunction: CaminhoMapper, provides?: string) {
    this.observable = pipe(this.observable, saveFunction, OperationType.SAVE, provides)
    return this
  }

  batch(count: number) {
    this.observable = this.observable.pipe(bufferCount(count))
    return this
  }

  timerBatch(ms: number, count: number) {
    this.observable = this.observable.pipe(bufferTime(ms, ms, count))
    return this
  }

  flatten() {
    this.observable = this.observable.pipe(mergeAll())
    return this
  }

  async start() {
    this.observable.subscribe()
  }
}
