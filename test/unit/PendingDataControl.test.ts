import { PendingDataControlInMemory } from '../../src/utils/PendingDataControl'

describe('PendingDataControl', () => {
  test('PendingDataControl should properly increment 1 value as default and start with zero', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    expect(pendingDataControl.size).toEqual(0)
    pendingDataControl.increment('a')
    expect(pendingDataControl.size).toEqual(1)
  })

  test('PendingDataControl should properly increment provided value', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a')
    expect(pendingDataControl.size).toEqual(1)
    pendingDataControl.increment('b', 5)
    expect(pendingDataControl.size).toEqual(6)
  })

  test('PendingDataControl should properly decrement 1 value as default and start with zero', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a')
    expect(pendingDataControl.size).toEqual(1)
    pendingDataControl.decrement('b')
    expect(pendingDataControl.size).toEqual(0)
  })

  test('PendingDataControl should properly decrement provided value', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a', 5)
    expect(pendingDataControl.size).toEqual(5)
    pendingDataControl.decrement('b', 4)
    expect(pendingDataControl.size).toEqual(1)
  })

  test('PendingDataControl should keep bucket accounting consistent when decrementing an unknown bucket', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a')
    pendingDataControl.decrement('b')
    expect(pendingDataControl.size).toEqual(0)

    // bucket 'b' holds -1, destroying it must add 1 back instead of NaN
    pendingDataControl.destroyBucket('b')
    expect(pendingDataControl.size).toEqual(1)

    pendingDataControl.destroyBucket('a')
    expect(pendingDataControl.size).toEqual(0)
  })

  test('destroyBucket should be a no-op on size for a bucket that never counted an item', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a')

    // e.g. a run whose generator yielded nothing still destroys its bucket on teardown
    pendingDataControl.destroyBucket('never-used')
    expect(pendingDataControl.size).toEqual(1)
  })

  test('acquireSlot should count the item immediately when below the limit', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a')

    await expect(pendingDataControl.acquireSlot('a', 2)).resolves.toBeUndefined()
    expect(pendingDataControl.size).toEqual(2)
  })

  test('acquireSlot should stay pending at the limit and consume the slot atomically once freed', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a', 2)

    const admitted = jest.fn()
    const waiting = pendingDataControl.acquireSlot('a', 2).then(admitted)

    await flushMicrotasks()
    expect(admitted).not.toHaveBeenCalled()
    expect(pendingDataControl.size).toEqual(2)

    pendingDataControl.decrement('a')
    await waiting
    expect(admitted).toHaveBeenCalled()
    // the freed slot is consumed by the admission, size is back at the limit
    expect(pendingDataControl.size).toEqual(2)
  })

  test('acquireSlot should admit only as many waiters as slots freed', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a', 3)

    const admittedFirst = jest.fn()
    const admittedSecond = jest.fn()
    const firstWaiting = pendingDataControl.acquireSlot('b', 3).then(admittedFirst)
    pendingDataControl.acquireSlot('c', 3).then(admittedSecond)

    pendingDataControl.decrement('a')
    await firstWaiting
    await flushMicrotasks()

    expect(admittedFirst).toHaveBeenCalled()
    expect(admittedSecond).not.toHaveBeenCalled()
    expect(pendingDataControl.size).toEqual(3)
  })

  test('destroyBucket should cancel its own waiters and hand freed capacity to other buckets', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a', 2)
    pendingDataControl.increment('b', 1)

    const admittedDoomed = jest.fn()
    const admittedHealthy = jest.fn()
    pendingDataControl.acquireSlot('a', 3).then(admittedDoomed)
    const healthyWaiting = pendingDataControl.acquireSlot('b', 3).then(admittedHealthy)

    pendingDataControl.destroyBucket('a')
    await healthyWaiting
    await flushMicrotasks()

    expect(admittedDoomed).not.toHaveBeenCalled()
    expect(admittedHealthy).toHaveBeenCalled()
    expect(pendingDataControl.size).toEqual(2)
  })
})

function flushMicrotasks() {
  return new Promise((resolve) => { setImmediate(resolve) })
}
