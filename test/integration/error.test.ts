import { from } from '../../src'
import { getMockedGenerator } from '../mocks/generator.mock'

describe('Error Handling', () => {
  test('Should pass generator error to run call stack', () => {
    // eslint-disable-next-line require-yield
    async function* generator(): AsyncGenerator<number> {
      throw new Error('Generator error')
    }

    const caminho = from({ fn: generator, provides: 'generatedData' })
      .pipe({ fn: jest.fn() })

    return expect(caminho.run()).rejects.toMatchObject({ message: 'Generator error' })
  })

  test('Should pass operator error to run call stack', () => {
    const operator = jest.fn().mockRejectedValue(new Error('Operator error'))
    const caminho = from({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .pipe({ fn: operator })

    return expect(caminho.run()).rejects.toMatchObject({ message: 'Operator error' })
  })

  test('Should pass filter error to run call stack', () => {
    const caminho = from({ fn: getMockedGenerator([1, 2]), provides: 'number' })
      .filter(() => { throw new Error('Filter error') })

    return expect(caminho.run()).rejects.toMatchObject({ message: 'Filter error' })
  })

  test('Should pass accumulator error to run call stack', () => {
    const accumulator = {
      fn: () => { throw new Error('Accumulator error') },
      seed: 0,
    }
    const caminho = from({ fn: getMockedGenerator([1, 2]), provides: 'number' })

    return expect(caminho.run({}, accumulator)).rejects.toMatchObject({ message: 'Accumulator error' })
  })
})
