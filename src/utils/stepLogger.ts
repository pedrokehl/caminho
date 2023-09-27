import type { OnEachStep, ValueBag } from '../types'

export type Logger = (valueBags: ValueBag[], stepStartedAt: Date) => void

export function getLogger(name: string, onEachStep?: OnEachStep): Logger {
  if (onEachStep) {
    return function logStep(valueBags: ValueBag[], stepStartedAt: Date) {
      const now = Date.now()
      const tookMs = now - stepStartedAt.getTime()
      onEachStep({ name, tookMs, valueBags, emitted: valueBags.length })
    }
  }
  return function stubLogger() {}
}
