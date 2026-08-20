import fc from 'fast-check'
import { fromArray, fromGenerator, type ValueBag } from '../../src'
import { sleep } from '../../src/utils/sleep'
import { getMockedGenerator } from '../mocks/generator.mock'

const latenciesArbitrary = fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 20 })

describe('Flow integrity properties', () => {
  test('parallel never mixes values across items, for any per-item latencies', async () => {
    await fc.assert(
      fc.asyncProperty(latenciesArbitrary, latenciesArbitrary, async (latenciesA, latenciesB) => {
        const itemCount = Math.min(latenciesA.length, latenciesB.length)
        const items = Array.from({ length: itemCount }, (_, index) => index)
        const results: ValueBag[] = []

        await fromArray({ items, provides: 'id' })
          .parallel([
            {
              fn: async ({ id }: { id: number }) => {
                await sleep(latenciesA[id])
                return `A${id}`
              },
              provides: 'a',
            },
            {
              fn: async ({ id }: { id: number }) => {
                await sleep(latenciesB[id])
                return `B${id}`
              },
              provides: 'b',
            },
          ])
          .pipe({ fn: (valueBag: ValueBag) => { results.push(valueBag) } })
          .run()

        expect(results).toHaveLength(itemCount)
        for (const valueBag of results) {
          expect(valueBag.a).toBe(`A${valueBag.id}`)
          expect(valueBag.b).toBe(`B${valueBag.id}`)
        }
      }),
      { numRuns: 15 },
    )
  })

  test('filter plus reduce always produce the exact expected aggregate, with and without backpressure', async () => {
    const valuesArbitrary = fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 30 })

    await fc.assert(
      fc.asyncProperty(valuesArbitrary, fc.boolean(), async (values, useBackpressure) => {
        const options = useBackpressure ? { maxItemsFlowing: 3 } : undefined
        const expectedSum = values.filter((value) => value % 2 === 0).reduce((acc, value) => acc + value, 0)

        const caminho = fromGenerator({ fn: getMockedGenerator(values), provides: 'n' }, options)
          .pipe({ fn: async () => sleep(1) })
          .filter({ fn: ({ n }: { n: number }) => n % 2 === 0 })
          .reduce({ fn: (acc: number, valueBag: ValueBag) => acc + valueBag.n, seed: 0, provides: 'sum' })

        const result = await caminho.run()

        expect(result.sum).toBe(expectedSum)
        if (useBackpressure) {
          expect(caminho.getNumberOfItemsFlowing()).toBe(0)
        }
      }),
      { numRuns: 15 },
    )
  })

  test('every item flows through every step exactly once, for any batch and concurrency configuration', async () => {
    const configArbitrary = fc.record({
      itemCount: fc.integer({ min: 1, max: 40 }),
      maxSize: fc.integer({ min: 1, max: 10 }),
      maxConcurrency: fc.integer({ min: 1, max: 8 }),
    })

    await fc.assert(
      fc.asyncProperty(configArbitrary, async ({ itemCount, maxSize, maxConcurrency }) => {
        const items = Array.from({ length: itemCount }, (_, index) => index)
        const seen: number[] = []

        await fromArray({ items, provides: 'n' })
          .pipe({
            fn: (valueBags: ValueBag[]) => valueBags.map(({ n }) => n * 2),
            provides: 'double',
            batch: { maxSize, timeoutMs: 5 },
            maxConcurrency,
          })
          .pipe({ fn: ({ n, double }: { n: number, double: number }) => { seen.push(n); expect(double).toBe(n * 2) } })
          .run()

        expect([...seen].sort((a, b) => a - b)).toEqual(items)
      }),
      { numRuns: 15 },
    )
  })
})
