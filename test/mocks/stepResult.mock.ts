import { OperationStatus, OperationType } from '../../src/operations/operations'

export function mockStepResult(mock: { name?: string, type: OperationType, status?: OperationStatus }) {
  return {
    name: mock.name ?? expect.any(String),
    status: mock.status ?? expect.any(String),
    tookMs: expect.any(Number),
    type: mock.type,
  }
}
