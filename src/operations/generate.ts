import { from, Observable } from 'rxjs'
import type { CaminhoGenerator, CaminhoOptions, ValueBag } from '../types'
import { OperationType } from './operations'
import { getLogger } from './stepLogger'

export function generate(
  asyncGeneratorFunction: CaminhoGenerator,
  provides: string,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const logger = getLogger(OperationType.GENERATE, asyncGeneratorFunction, caminhoOptions)

  async function* wrappedGenerator() {
    let stepStartedAt: number = Date.now()
    for await (const value of asyncGeneratorFunction()) {
      logger(stepStartedAt)
      stepStartedAt = Date.now()
      yield { [provides]: value }
    }
  }

  return from(wrappedGenerator())
}
