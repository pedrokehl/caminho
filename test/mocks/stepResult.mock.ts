export function mockStepResult(mock: { name?: string, emitted?: number }) {
  return {
    name: mock.name ?? expect.any(String),
    tookMs: expect.any(Number),
    emitted: mock.emitted ?? expect.any(Number),
    valueBags: expect.any(Array),
  }
}
