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

  test('waitUntilBelow should resolve immediately when size is already below the threshold', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a')
    await expect(pendingDataControl.waitUntilBelow(2)).resolves.toBeUndefined()
  })

  test('waitUntilBelow should resolve once decrement brings the size below the threshold', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a', 3)

    const resolved = jest.fn()
    const waiting = pendingDataControl.waitUntilBelow(2).then(resolved)

    await flushMicrotasks()
    expect(resolved).not.toHaveBeenCalled()

    // size drops to 2, still not below the threshold, the waiter must be kept
    pendingDataControl.decrement('a')
    await flushMicrotasks()
    expect(resolved).not.toHaveBeenCalled()

    // size drops to 1, below the threshold
    pendingDataControl.decrement('a')
    await waiting
    expect(resolved).toHaveBeenCalled()
  })

  test('waitUntilBelow should resolve when destroyBucket brings the size below the threshold', async () => {
    const pendingDataControl = new PendingDataControlInMemory()
    pendingDataControl.increment('a', 5)

    const resolved = jest.fn()
    const waiting = pendingDataControl.waitUntilBelow(5).then(resolved)

    await flushMicrotasks()
    expect(resolved).not.toHaveBeenCalled()

    pendingDataControl.destroyBucket('a')
    await waiting
    expect(resolved).toHaveBeenCalled()
  })
})

function flushMicrotasks() {
  return new Promise((resolve) => { setImmediate(resolve) })
}
