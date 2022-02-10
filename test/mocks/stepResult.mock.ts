import { OperationType } from '../../src/types'

export function mockStepResult(mock: { name?: string, type: OperationType }) {
  return {
    name: mock.name ?? expect.any(String),
    tookMs: expect.any(Number),
    type: mock.type,
  }
}
