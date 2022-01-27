import { CaminhoOptions, OperationStatus, OperationType } from '../types'

export function getLogger(operationType: OperationType, executor: { name: string }, caminhoOptions?: CaminhoOptions) {
  if (caminhoOptions?.onEachStep) {
    const onEachStep = caminhoOptions?.onEachStep

    return function logStep(stepStartedAt: number) {
      const tookMs = Date.now() - stepStartedAt

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
