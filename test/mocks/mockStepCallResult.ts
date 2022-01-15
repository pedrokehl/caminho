import { OperationType } from '../../src/operations/operations'

export function mockStepResultForCallsCheck(type: OperationType) {
  return [
    {
      name: expect.any(String),
      status: expect.any(String),
      tookMs: expect.any(Number),
      type,
    },
  ]
}
