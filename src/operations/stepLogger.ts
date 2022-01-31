import { OnEachStep, OperationStatus, OperationType } from '../types'

export type Logger = () => void

export function getLogger(operationType: OperationType, executor: { name: string }, onEachStep?: OnEachStep) {
  if (onEachStep) {
    let stepStartedAt: number = Date.now()

    return function logStep() {
      const now = Date.now()
      const tookMs = now - stepStartedAt
      stepStartedAt = now

      onEachStep({
        name: executor.name,
        type: operationType,
        status: OperationStatus.SUCCESS,
        tookMs,
      })
    }
  }
  return function stubLogger() {}
}
