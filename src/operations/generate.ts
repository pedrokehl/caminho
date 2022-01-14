import { from, Observable } from 'rxjs'
import type { CaminhoGenerator, CaminhoOptions, ValueBag } from '../types'
import { OperationType } from './operations'
import { getLogger } from './stepLogger'
import { getRandomInt } from '../helpers/random'

export function generate(
  asyncGeneratorFunction: CaminhoGenerator,
  provides: string,
  onGeneratorFinish: (onGeneratorResult: { emitted: number }) => void,
  pendingDataControl: Set<number>,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const logger = getLogger(OperationType.GENERATE, asyncGeneratorFunction, caminhoOptions)

  async function* wrappedGenerator() {
    let count = 0
    let stepStartedAt: number = Date.now()
    for await (const value of asyncGeneratorFunction()) {
      logger(stepStartedAt)
      stepStartedAt = Date.now()
      count++
      const uniqueId = getRandomInt()
      pendingDataControl.add(uniqueId)
      yield { [provides]: value, _uniqueId: uniqueId }
    }
    onGeneratorFinish({ emitted: count })
  }

  return from(wrappedGenerator())
}
