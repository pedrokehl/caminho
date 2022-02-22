import type { OnEachStep } from '../types'

export type Logger = (emitted?: number) => void

export function getLogger(name: string, onEachStep?: OnEachStep): Logger {
  if (onEachStep) {
    let stepStartedAt: number = Date.now()

    return function logStep(emitted = 1) {
      const now = Date.now()
      const tookMs = now - stepStartedAt
      stepStartedAt = now

      onEachStep({ name, tookMs, emitted })
    }
  }
  return function stubLogger() {}
}
