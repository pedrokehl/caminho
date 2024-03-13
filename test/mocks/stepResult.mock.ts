export function getOnStepFinishedParamsFixture(mock: { name?: string, emitted?: number, error?: Error }) {
  return {
    name: mock.name,
    tookMs: expect.any(Number),
    emitted: mock.emitted ?? expect.any(Number),
    valueBags: expect.any(Array),
    error: mock.error,
  }
}

export function getOnStepStartedParamsFixture(mock: { name?: string, received?: number }) {
  return {
    name: mock.name,
    received: mock.received ?? expect.any(Number),
    valueBags: expect.any(Array),
  }
}
