import { getNewValueBag } from '../utils/valueBag'
import type { PendingDataControl } from '../utils/PendingDataControl'
import type { Loggers, ValueBag } from '../types'
import type { FromGeneratorParams } from '../from'

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

/**
 * The generator only waits for capacity here, it does not do any accounting:
 * items are counted by the run's source observable when they are actually delivered into the flow.
 * Counting inside the generator would leak items that are produced but never
 * consumed when a run errors during a backpressure wait.
 */
export function wrapGeneratorWithBackPressure(
  generatorParams: FromGeneratorParams,
  maxItemsFlowing: number,
  pendingDataControl: PendingDataControl,
  loggers: Loggers,
) {
  const wrappedGenerator = wrapGenerator(generatorParams, loggers)
  return async function* wrappedGeneratorWithBackPressure(initialBag: ValueBag) {
    for await (const value of wrappedGenerator({ ...initialBag })) {
      yield value
      if (pendingDataControl.size >= maxItemsFlowing) {
        await pendingDataControl.waitUntilBelow(maxItemsFlowing)
      }
    }
  }
}
