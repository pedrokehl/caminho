import { ValueBag } from '../types'
import { sleep } from '../utils/sleep'
import { Logger } from '../utils/stepLogger'
import { PendingDataControl } from '../utils/PendingDataControl'
import { getNewValueBag } from '../utils/valueBag'

const SLEEP_FOR_BACKPRESSURE_MS = 10

export interface SourceParams {
  fn: (initialBag: ValueBag) => AsyncGenerator
  provides: string
  maxItemsFlowing?: number
  name?: string
}

export function wrapGenerator(
  sourceParams: SourceParams,
  pendingDataControl: PendingDataControl,
  logger: Logger,
) {
  const checksForBackpressure = getNeedsToWaitForBackpressure(sourceParams.maxItemsFlowing)

  return async function* wrappedGenerator(initialBag: ValueBag) {
    for await (const value of sourceParams.fn(initialBag)) {
      if (checksForBackpressure(pendingDataControl)) {
        await waitOnBackpressure(sourceParams.maxItemsFlowing as number, pendingDataControl)
      }

      pendingDataControl.increment()
      logger()
      yield getNewValueBag(initialBag, sourceParams.provides, value)
    }
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
