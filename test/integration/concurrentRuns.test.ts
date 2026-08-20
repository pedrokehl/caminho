import { fromGenerator, type ValueBag } from '../../src'
import { sleep } from '../../src/utils/sleep'

describe('Concurrent runs of the same Caminho instance', () => {
  test('Should share the maxItemsFlowing budget and still complete both runs', async () => {
    async function* generator(initialBag: ValueBag) {
      for (let i = 1; i <= 10; i += 1) {
        yield `${initialBag.label}${i}`
      }
    }

    const caminho = fromGenerator({ fn: generator, provides: 'item' }, { maxItemsFlowing: 3 })
      .pipe({ fn: () => sleep(1) })
      .reduce({ fn: (acc: number) => acc + 1, seed: 0, provides: 'count' })

    const [first, second] = await Promise.all([
      caminho.run({ label: 'X' }),
      caminho.run({ label: 'Y' }),
    ])

    expect(first).toEqual({ count: 10 })
    expect(second).toEqual({ count: 10 })
    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })

  test('Should keep an errored run from corrupting a healthy concurrent run', async () => {
    async function* generator(initialBag: ValueBag) {
      for (let i = 1; i <= 10; i += 1) {
        yield `${initialBag.label}${i}`
      }
    }

    async function stepFn(valueBag: ValueBag) {
      await sleep(1)
      if (valueBag.shouldFail && valueBag.item === 'X5') {
        throw new Error('Step error')
      }
    }

    const caminho = fromGenerator({ fn: generator, provides: 'item' }, { maxItemsFlowing: 3 })
      .pipe({ fn: stepFn })
      .reduce({ fn: (acc: number) => acc + 1, seed: 0, provides: 'count' })

    const [failed, healthy] = await Promise.allSettled([
      caminho.run({ label: 'X', shouldFail: true }),
      caminho.run({ label: 'Y', shouldFail: false }),
    ])

    expect(failed).toMatchObject({ status: 'rejected', reason: new Error('Step error') })
    expect(healthy).toMatchObject({ status: 'fulfilled', value: { count: 10 } })
    expect(caminho.getNumberOfItemsFlowing()).toBe(0)
  })
})
