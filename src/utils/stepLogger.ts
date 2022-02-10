import type { OnEachStep, OperationType } from '../types'

export type Logger = () => void

export function getLogger(operationType: OperationType, name: string, onEachStep?: OnEachStep): Logger {
  if (onEachStep) {
    let stepStartedAt: number = Date.now()

    return function logStep() {
      const now = Date.now()
      const tookMs = now - stepStartedAt
      stepStartedAt = now

      onEachStep({ name, type: operationType, tookMs })
    }
  }
  return function stubLogger() {}
}
