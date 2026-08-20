import { getNewValueBag } from '../utils/valueBag'
import type { PendingDataControl } from '../utils/PendingDataControl'
import type { Loggers, ValueBag } from '../types'
import type { FromGeneratorParams } from '../from'

export function wrapGenerator(generatorParams: FromGeneratorParams, loggers: Loggers) {
  return async function* wrappedGenerator(initialBag: ValueBag) {
    const bagArrayForLogger = [initialBag]
    loggers.onStepStarted(bagArrayForLogger)
    let isStart = true
    let startTime = performance.now()

    try {
      for await (const value of generatorParams.fn(initialBag)) {
        if (!isStart) {
          loggers.onStepStarted(bagArrayForLogger)
        }
        isStart = false
        const newValueBag = getNewValueBag(initialBag, generatorParams.provides, value)
        loggers.onStepFinished([newValueBag], startTime)
        yield newValueBag
        startTime = performance.now()
      }
    } catch (err) {
      loggers.onStepFinished([initialBag], startTime, err as Error)
      throw err
    }
  }
}

/**
 * Each item acquires a slot before it is produced, so the source never runs ahead of capacity.
 * If the run is torn down while waiting, acquireSlot resolves false so the inner generator is
 * still closed and its `finally` cleanup runs.
 */
export function wrapGeneratorWithBackPressure(
  generatorParams: FromGeneratorParams,
  maxItemsFlowing: number,
  pendingDataControl: PendingDataControl,
  loggers: Loggers,
) {
  const wrappedGenerator = wrapGenerator(generatorParams, loggers)
  return async function* wrappedGeneratorWithBackPressure(initialBag: ValueBag, runId: string) {
    const iterator = wrappedGenerator({ ...initialBag })
    try {
      while (await pendingDataControl.acquireSlot(runId, maxItemsFlowing)) {
        const next = await iterator.next()
        if (next.done) {
          pendingDataControl.decrement(runId)
          return
        }
        yield next.value
      }
    } finally {
      await iterator.return(undefined)
    }
  }
}
