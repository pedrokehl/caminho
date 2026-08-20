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
 * Each item atomically acquires a slot (which counts it into the run's bucket) before it is even
 * produced, so the generator never runs ahead of the available capacity. A run torn down by an
 * error cannot corrupt the shared budget: destroying its bucket removes its counted items and
 * settles its queued slot requests as canceled, which resumes a suspended wrapper so the inner
 * generator is closed and its cleanup (finally) runs.
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
