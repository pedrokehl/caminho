export function getOnStepFinishedParamsFixture(mock: { name?: string, emitted?: number }) {
  return {
    name: mock.name,
    tookMs: expect.any(Number),
    emitted: mock.emitted ?? expect.any(Number),
    valueBags: expect.any(Array),
  }
}

export function getOnStepStartedParamsFixture(mock: { name?: string, received?: number }) {
  return {
    name: mock.name,
    received: mock.received ?? expect.any(Number),
    valueBags: expect.any(Array),
  }
}
