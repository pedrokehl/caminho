import { OperationStatus, OperationType } from '../../src/types'

export function mockStepResult(mock: { name?: string, type: OperationType, status?: OperationStatus }) {
  return {
    name: getOrFallback(mock.name, expect.any(String)),
    status: getOrFallback(mock.status, expect.any(String)),
    tookMs: expect.any(Number),
    type: mock.type,
  }
}

function getOrFallback<T, A>(value: T, fallback: A) {
  return value ?? fallback
}
