import { from, Observable } from 'rxjs'
import { CaminhoOptions, ValueBag, OperationType } from '../types'
import { getLogger } from './stepLogger'

import { getRandomInt } from '../helpers/random'
import { sleep } from '../helpers/sleep'

const SLEEP_FOR_BACKPRESSURE_MS = 10

export interface SourceParams {
  fn: () => AsyncGenerator
  provides: string
  maxItemsFlowing?: number
}

export interface SourceResult {
  emitted: number
}

export function source(
  sourceParams: SourceParams,
  onSourceFinish: (sourceResult: SourceResult) => void,
  pendingDataControl: Set<number>,
  caminhoOptions?: CaminhoOptions,
): Observable<ValueBag> {
  const logger = getLogger(OperationType.GENERATE, sourceParams.fn, caminhoOptions)

  async function* wrappedGenerator() {
    let count = 0
    let stepStartedAt: number = Date.now()
    for await (const value of sourceParams.fn()) {
      count++
      const uniqueId = getRandomInt()
      pendingDataControl.add(uniqueId)
      yield { [sourceParams.provides]: value, _uniqueId: uniqueId }
      logger(stepStartedAt)
      stepStartedAt = Date.now()
      if (sourceParams.maxItemsFlowing && pendingDataControl.size >= sourceParams.maxItemsFlowing) {
        await waitOnBackpressure(sourceParams.maxItemsFlowing, pendingDataControl)
      }
    }
    onSourceFinish({ emitted: count })
  }

  return from(wrappedGenerator())
}

async function waitOnBackpressure(maxItemsFlowing: number, pendingDataControl: Set<number>) {
  while (pendingDataControl.size >= maxItemsFlowing) {
    await sleep(SLEEP_FOR_BACKPRESSURE_MS)
  }
}
