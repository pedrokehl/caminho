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
  }
}

export function wrapGeneratorWithBackPressure(
  generatorParams: FromGeneratorParams,
  maxItemsFlowing: number,
  pendingDataControl: PendingDataControl,
  loggers: Loggers,
) {
  return async function* wrappedGeneratorWithBackPressure(initialBag: ValueBag) {
    const bagArrayForLogger = [initialBag]
    loggers.onStepStarted(bagArrayForLogger)
    let isStart = true
    let startTime = new Date()
    for await (const value of generatorParams.fn(initialBag)) {
      if (!isStart) {
        loggers.onStepStarted(bagArrayForLogger)
      }
      isStart = false
      const newValueBag = getNewValueBag(initialBag, generatorParams.provides, value)
      if (needsToWaitForBackpressure(pendingDataControl, maxItemsFlowing)) {
        await waitOnBackpressure(maxItemsFlowing, pendingDataControl)
      }
      pendingDataControl.increment()
      loggers.onStepFinished([newValueBag], startTime)
      yield newValueBag
      startTime = new Date()
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
