import assert from 'node:assert/strict'
import { fromArray, fromGenerator, fromValue, fromFn } from 'caminho'

async function testFullFlow() {
  const batchSizes = []
  const result = await fromArray({ items: [1, 2, 3, 4], provides: 'n' }, { maxItemsFlowing: 2 })
    .pipe({ fn: (bag) => bag.n * 2, provides: 'double' })
    .filter({ fn: (bag) => bag.double !== 4 })
    .parallel([
      { fn: (bag) => `name-${bag.n}`, provides: 'name' },
      { fn: async (bag) => bag.n % 2 === 0, provides: 'even' },
    ])
    .pipe({
      fn: (bags) => {
        batchSizes.push(bags.length)
        return bags.map((bag) => bag.double + 1)
      },
      batch: { maxSize: 2, timeoutMs: 100 },
      provides: 'incremented',
    })
    .reduce({ fn: (acc, bag) => acc + bag.incremented, seed: 0, provides: 'sum' })
    .run()

  assert.equal(result.sum, 3 + 7 + 9)
  assert.equal(batchSizes.reduce((acc, size) => acc + size, 0), 3)
}

async function testEntryPoints() {
  async function* letters() {
    yield 'a'
    yield 'b'
  }
  const generated = await fromGenerator({ fn: letters, provides: 'letter' })
    .reduce({ fn: (acc, bag) => acc + bag.letter, seed: '', provides: 'letters' })
    .run()
  assert.equal(generated.letters, 'ab')

  const fromSingleValue = await fromValue({ item: 21, provides: 'answer' })
    .pipe({ fn: (bag) => bag.answer * 2, provides: 'doubled' })
    .run()
  assert.equal(fromSingleValue.doubled, 42)

  const fromFunction = await fromFn({ fn: async () => [1, 2, 3], provides: 'items' }).run()
  assert.deepEqual(fromFunction.items, [1, 2, 3])
}

await testFullFlow()
await testEntryPoints()
console.log('ESM consumer OK')
