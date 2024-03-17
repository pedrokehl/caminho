import { sleep } from '../utils/sleep'
import { getNewValueBag } from '../utils/valueBag'
import type { PendingDataControl } from '../utils/PendingDataControl'
import type { Loggers, ValueBag } from '../types'
import type { FromGeneratorParams } from '../from'

const SLEEP_FOR_BACKPRESSURE_MS = 10

export function wrapGenerator(generatorParams: FromGeneratorParams, loggers: Loggers) {
  return async function* wrappedGenerator(initialBag: ValueBag) {
    const bagArrayForLogger = [initialBag]
    loggers.onStepStarted(bagArrayForLogger)
    let isStart = true
    let startTime = new Date()

    try {
      for await (const value of generatorParams.fn(initialBag)) {
        if (!isStart) {
          loggers.onStepStarted(bagArrayForLogger)
        }
        isStart = false
        const newValueBag = getNewValueBag(initialBag, generatorParams.provides, value)
        loggers.onStepFinished([newValueBag], startTime)
        yield newValueBag
        startTime = new Date()
      }
    } catch (err) {
      loggers.onStepFinished([initialBag], startTime, err as Error)
      throw err
    }
  }
}

export function wrapGeneratorWithBackPressure(
  generatorParams: FromGeneratorParams,
  maxItemsFlowing: number,
  pendingDataControl: PendingDataControl,
  loggers: Loggers,
) {
  const wrappedGenerator = wrapGenerator(generatorParams, loggers)
  return async function* wrappedGeneratorWithBackPressure(initialBag: ValueBag) {
    for await (const value of wrappedGenerator(initialBag)) {
      pendingDataControl.increment()
      yield value
      if (needsToWaitForBackpressure(pendingDataControl, maxItemsFlowing)) {
        await waitOnBackpressure(maxItemsFlowing, pendingDataControl)
      }
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
