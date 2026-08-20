import { expectTypeOf } from 'expect-type'
import { fromArray, fromFn, fromGenerator, fromValue, type OpenBag } from '../../src'

describe('ValueBag typing', () => {
  test('from* entry points type the bag from provides', async () => {
    expectTypeOf(fromArray({ items: [1, 2], provides: 'n' }).run()).resolves.toEqualTypeOf<OpenBag<{ n: number }>>()
    expectTypeOf(fromValue({ item: 'hi', provides: 's' }).run()).resolves.toEqualTypeOf<OpenBag<{ s: string }>>()
    expectTypeOf(fromFn({ fn: async () => true, provides: 'ok' }).run())
      .resolves.toEqualTypeOf<OpenBag<{ ok: boolean }>>()

    async function* generate() {
      yield 1
    }
    expectTypeOf(fromGenerator({ fn: generate, provides: 'g' }).run()).resolves.toEqualTypeOf<OpenBag<{ g: number }>>()
  })

  test('pipe accumulates provides and preserves the bag without provides', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: ({ n }) => String(n), provides: 's' })
      .pipe({ fn: (bag) => expectTypeOf(bag).toEqualTypeOf<OpenBag<{ n: number, s: string }>>() })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: number, s: string }>>()
  })

  test('providing an existing key replaces its type instead of intersecting', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: ({ n }) => String(n), provides: 'n' })
      .pipe({ fn: (bag) => expectTypeOf(bag.n).toEqualTypeOf<string>() })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: string }>>()
  })

  test('async pipe fn provides the awaited value', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: async () => new Date(), provides: 'when' })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: number, when: Date }>>()
  })

  test('batch steps provide the element type of the returned array', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({
        fn: (bags) => bags.map(({ n }) => n % 2 === 0),
        provides: 'even',
        batch: { maxSize: 10, timeoutMs: 5 },
      })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: number, even: boolean }>>()
  })

  test('parallel accumulates provides from all branches', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .parallel([
        { fn: async ({ n }: { n: number }) => n * 2, provides: 'double' },
        { fn: async ({ n }: { n: number }) => `${n}`, provides: 'text' },
        { fn: async () => {} },
      ])

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: number, double: number, text: string }>>()
  })

  test('batched parallel branches with provides must return an array of values', () => {
    const batch = { maxSize: 10, timeoutMs: 5 }

    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .parallel([
        { fn: (bags) => bags.map(({ n }) => n * 2), provides: 'double', batch },
        { fn: async () => {}, batch },
      ])
    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: number, double: number }>>()

    fromArray({ items: [1, 2], provides: 'n' })
      .parallel([
        // @ts-expect-error a providing batched branch must return one value per bag, in an array
        { fn: () => 123, provides: 'broken', batch },
      ])
  })

  test('filter preserves the bag type', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .filter({ fn: ({ n }) => n > 0 })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ n: number }>>()
  })

  test('reduce replaces the bag with the aggregation plus kept properties', () => {
    const flow = fromArray({ items: [1, 2], provides: 'n' })
      .pipe({ fn: ({ n }) => String(n), provides: 's' })
      .reduce({ fn: (acc: number, { n }) => acc + n, seed: 0, provides: 'sum', keep: ['s'] })

    expectTypeOf(flow.run()).resolves.toEqualTypeOf<OpenBag<{ sum: number, s: string }>>()
  })

  test('step functions and run results accept properties carried by the run initialBag', async () => {
    const result = await fromArray({ items: [1, 2], provides: 'n' })
      .pipe({
        fn: (bag) => {
          expectTypeOf(bag.n).toEqualTypeOf<number>()
          return bag.initial === true
        },
        provides: 'fromInitial',
      })
      .run({ initial: true })

    expect(result.fromInitial).toBe(true)
    expect(result.initial).toBe(true)
  })

  test('runtime behavior matches the declared types', async () => {
    const result = await fromArray({ items: [1, 2, 3], provides: 'n' })
      .pipe({ fn: ({ n }) => n * 10, provides: 'tens' })
      .reduce({ fn: (acc: number, { tens }) => acc + tens, seed: 0, provides: 'total' })
      .run()

    expect(result).toEqual({ total: 60 })
  })
})
