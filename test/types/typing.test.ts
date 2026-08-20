import { expectTypeOf } from 'expect-type'
import { fromArray, fromFn, fromGenerator, fromValue } from '../../src'

describe('ValueBag typing', () => {
  test('from* entry points type the bag from provides', async () => {
    expectTypeOf(fromArray({ items: [1, 2], provides: 'n' }).run()).resolves.toEqualTypeOf<{ n: number }>()
    expectTypeOf(fromValue({ item: 'hi', provides: 's' }).run()).resolves.toEqualTypeOf<{ s: string }>()
    expectTypeOf(fromFn({ fn: async () => true, provides: 'ok' }).run()).resolves.toEqualTypeOf<{ ok: boolean }>()

    async function* generate() {
      yield 1
    }
    expectTypeOf(fromGenerator({ fn: generate, provides: 'g' }).run()).resolves.toEqualTypeOf<{ g: number }>()
  })

  test('pipe accumulates provides and preserves the bag without provides', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: ({ n }) => String(n), provides: 's' })
      .pipe({ fn: (bag) => expectTypeOf(bag).toEqualTypeOf<{ n: number } & { s: string }>() })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<{ n: number } & { s: string }>()
  })

  test('async pipe fn provides the awaited value', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: async () => new Date(), provides: 'when' })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<{ n: number } & { when: Date }>()
  })

  test('batch steps provide the element type of the returned array', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({
        fn: (bags) => bags.map(({ n }) => n % 2 === 0),
        provides: 'even',
        batch: { maxSize: 10, timeoutMs: 5 },
      })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<{ n: number } & { even: boolean }>()
  })

  test('parallel accumulates provides from all branches', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .parallel([
        { fn: async ({ n }: { n: number }) => n * 2, provides: 'double' },
        { fn: async ({ n }: { n: number }) => `${n}`, provides: 'text' },
        { fn: async () => {} },
      ])

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<{ n: number } & { double: number } & { text: string }>()
  })

  test('filter preserves the bag type', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .filter({ fn: ({ n }) => n > 0 })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<{ n: number }>()
  })

  test('reduce replaces the bag with the aggregation plus kept properties', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: ({ n }) => String(n), provides: 's' })
      .reduce({ fn: (acc: number, { n }) => acc + n, seed: 0, provides: 'sum', keep: ['s'] })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<Record<'sum', number> & { s: string }>()
  })

  test('runtime behavior matches the declared types', async () => {
    const result = await fromArray({ items: [1, 2, 3], provides: 'n' })
      .pipe({ fn: ({ n }) => n * 10, provides: 'tens' })
      .reduce({ fn: (acc: number, { tens }) => acc + tens, seed: 0, provides: 'total' })
      .run()

    expect(result).toEqual({ total: 60 })
  })
})
