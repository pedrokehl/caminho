export function getMockedGenerator(numberOfValuesToEmit: number) {
  const sequence = new Array(numberOfValuesToEmit).fill(0).map((value, index) => `${index + 1}`)
  const response = { called: 0, generator: null }

  async function* generator(): AsyncGenerator<{ job_id: string }> {
    for await (const id of sequence) {
      yield { job_id: id }
      response.called += 1
    }
  }

  response.generator = generator
  return response
}
