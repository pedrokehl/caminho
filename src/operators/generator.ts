import { ValueBag } from '../types'
import { sleep } from '../utils/sleep'
import { Logger } from '../utils/stepLogger'
import { PendingDataControl } from '../utils/PendingDataControl'
import { getNewValueBag } from '../utils/valueBag'

const SLEEP_FOR_BACKPRESSURE_MS = 10

export interface GeneratorParams {
  fn: (initialBag: ValueBag) => AsyncGenerator
  provides: string
  name?: string
}

export function wrapGenerator(generatorParams: GeneratorParams, logger: Logger) {
  return async function* wrappedGenerator(initialBag: ValueBag) {
    for await (const value of generatorParams.fn(initialBag)) {
      logger()
      yield getNewValueBag(initialBag, generatorParams.provides, value)
    }
  }
}

export function wrapGeneratorWithBackPressure(
  generatorParams: GeneratorParams,
  maxItemsFlowing: number,
  pendingDataControl: PendingDataControl,
  logger: Logger,
) {
  return async function* wrappedGenerator(initialBag: ValueBag) {
    for await (const value of generatorParams.fn(initialBag)) {
      if (needsToWaitForBackpressure(pendingDataControl, maxItemsFlowing)) {
        await waitOnBackpressure(maxItemsFlowing, pendingDataControl)
      }

      pendingDataControl.increment()
      logger()
      yield getNewValueBag(initialBag, generatorParams.provides, value)
    }
  }
}

function needsToWaitForBackpressure(pendingDataControl: PendingDataControl, maxItemsFlowing: number) {
  return pendingDataControl.size >= maxItemsFlowing
}

async function waitOnBackpressure(maxItemsFlowing: number, pendingDataControl: PendingDataControl): Promise<void> {
  while (pendingDataControl.size >= maxItemsFlowing) {
    await sleep(SLEEP_FOR_BACKPRESSURE_MS)
  }
}
