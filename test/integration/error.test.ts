import { fromGenerator } from '../../src'
import { getMockedGenerator, getThrowingGenerator } from '../mocks/generator.mock'

describe('Error Handling', () => {
  test('Should pass "generator" error to run call stack', async () => {
    const caminho = fromGenerator({ fn: getThrowingGenerator(new Error('Generator error')), provides: 'generatedData' })
    await expect(caminho.run()).rejects.toMatchObject({ message: 'Generator error' })
  })

  test('Should pass "generator with backpressure" error to run call stack', async () => {
    const onStepFinished = jest.fn()
    const options = { maxItemsFlowing: 1, onStepFinished }
    const throwingGenerator = getThrowingGenerator(new Error('Generator error'))
    const caminho = fromGenerator({ fn: throwingGenerator, provides: 'generatedData' }, options)
    await expect(caminho.run()).rejects.toMatchObject({ message: 'Generator error' })
  })

  test('Should pass "pipe" error to run call stack', async () => {
    const operator = jest.fn().mockRejectedValue(new Error('Operator error'))
    const caminho = fromGenerator({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .pipe({ fn: operator })

    await expect(caminho.run()).rejects.toMatchObject({ message: 'Operator error' })
  })

  test('Should pass "batch" error to run call stack', async () => {
    const operator = jest.fn().mockRejectedValue(new Error('Operator error'))
    const caminho = fromGenerator({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .pipe({ fn: operator, batch: { maxSize: 10, timeoutMs: 1 } })

    await expect(caminho.run()).rejects.toMatchObject({ message: 'Operator error' })
  })

  test('Should pass "parallel" error to run call stack', async () => {
    const operator = jest.fn().mockRejectedValue(new Error('Operator error'))
    const caminho = fromGenerator({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .parallel([{ fn: operator }])

    await expect(caminho.run()).rejects.toMatchObject({ message: 'Operator error' })
  })

  test('Should pass "filter" error to run call stack', async () => {
    const caminho = fromGenerator({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .filter({ fn: () => { throw new Error('Filter error') } })

    await expect(caminho.run()).rejects.toMatchObject({ message: 'Filter error' })
  })

  test('Should pass "reduce" error to run call stack', async () => {
    const caminho = fromGenerator({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .reduce({
        fn: () => { throw new Error('Reduce error') },
        seed: 0,
        provides: 'doesntMatter',
      })

    await expect(caminho.run()).rejects.toMatchObject({ message: 'Reduce error' })
  })

  test('Should not interfere with the backpressure when error happens', async () => {
    const operator = jest.fn().mockRejectedValueOnce(new Error('Operator error')).mockResolvedValue(null)
    const caminho = fromGenerator({ fn: getMockedGenerator([1, 2]), provides: 'number' }, { maxItemsFlowing: 1 })
      .pipe({ fn: operator })

    await expect(caminho.run()).rejects.toMatchObject({ message: 'Operator error' })
    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })
})
