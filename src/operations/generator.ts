import { ValueBag } from '../types'
import { sleep } from '../helpers/sleep'
import { Logger } from './stepLogger'
import { PendingDataControl } from '../PendingDataControl'
import { getNewValueBag } from './valueBag'

const SLEEP_FOR_BACKPRESSURE_MS = 10

export interface SourceParams {
  fn: () => AsyncGenerator
  provides: string
  maxItemsFlowing?: number
  name?: string
}

export interface SourceResult {
  emitted: number
}

export function wrapGenerator(
  sourceParams: SourceParams,
  onSourceFinish: (sourceResult: SourceResult) => void,
  pendingDataControl: PendingDataControl,
  logger: Logger,
) {
  const checksForBackpressure = getNeedsToWaitForBackpressure(sourceParams.maxItemsFlowing)

  return async function* wrappedGenerator(initialBag: ValueBag) {
    let count = 0
    for await (const value of sourceParams.fn()) {
      if (checksForBackpressure(pendingDataControl)) {
        await waitOnBackpressure(sourceParams.maxItemsFlowing as number, pendingDataControl)
      }

      count++
      pendingDataControl.increment()
      logger()
      yield getNewValueBag(initialBag, sourceParams.provides, value)
    }
    onSourceFinish({ emitted: count })
  }
}

function getNeedsToWaitForBackpressure(maxItemsFlowing: number | undefined) {
  if (maxItemsFlowing === undefined) {
    return () => false
  }

  return function needsToWaitForBackpressure(pendingDataControl: PendingDataControl) {
    return pendingDataControl.size >= maxItemsFlowing
  }
}

async function waitOnBackpressure(maxItemsFlowing: number, pendingDataControl: PendingDataControl): Promise<void> {
  while (pendingDataControl.size >= maxItemsFlowing) {
    await sleep(SLEEP_FOR_BACKPRESSURE_MS)
  }
}
