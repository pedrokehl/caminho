import { from, Observable } from 'rxjs'
import type { CaminhoOptions, ValueBag } from '../types'
import { GeneratorParams, OperationType } from './operations'
import { getLogger } from './stepLogger'

import { getRandomInt } from '../helpers/random'
import { sleep } from '../helpers/sleep'

const SLEEP_FOR_BACKPRESSURE_MS = 10

export function generate(
  generatorParams: GeneratorParams,
  onGeneratorFinish: (onGeneratorResult: { emitted: number }) => void,
  pendingDataControl: Set<number>,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const logger = getLogger(OperationType.GENERATE, generatorParams.fn, caminhoOptions)

  async function* wrappedGenerator() {
    let count = 0
    let stepStartedAt: number = Date.now()
    for await (const value of generatorParams.fn()) {
      count++
      const uniqueId = getRandomInt()
      pendingDataControl.add(uniqueId)
      yield { [generatorParams.provides]: value, _uniqueId: uniqueId }
      logger(stepStartedAt)
      stepStartedAt = Date.now()
      if (generatorParams.maxItemsFlowing && pendingDataControl.size >= generatorParams.maxItemsFlowing) {
        await waitOnBackpressure(generatorParams.maxItemsFlowing, pendingDataControl)
      }
    }
    onGeneratorFinish({ emitted: count })
  }

  return from(wrappedGenerator())
}

async function waitOnBackpressure(maxItemsFlowing: number, pendingDataControl: Set<number>) {
  while (pendingDataControl.size >= maxItemsFlowing) {
    await sleep(SLEEP_FOR_BACKPRESSURE_MS)
  }
}
