import { PendingDataControlInMemory } from '../src/PendingDataControl'

test('PendingDataControl should properly increment 1 value as default and start with zero', async () => {
  const pendingDataControl = new PendingDataControlInMemory()
  expect(pendingDataControl.size).toEqual(0)
  pendingDataControl.increment()
  expect(pendingDataControl.size).toEqual(1)
})

test('PendingDataControl should properly increment provided value', async () => {
  const pendingDataControl = new PendingDataControlInMemory()
  pendingDataControl.increment()
  expect(pendingDataControl.size).toEqual(1)
  pendingDataControl.increment(5)
  expect(pendingDataControl.size).toEqual(6)
})

test('PendingDataControl should properly decrement 1 value as default and start with zero', async () => {
  const pendingDataControl = new PendingDataControlInMemory()
  pendingDataControl.increment()
  expect(pendingDataControl.size).toEqual(1)
  pendingDataControl.decrement()
  expect(pendingDataControl.size).toEqual(0)
})

test('PendingDataControl should properly decrement provided value', async () => {
  const pendingDataControl = new PendingDataControlInMemory()
  pendingDataControl.increment(5)
  expect(pendingDataControl.size).toEqual(5)
  pendingDataControl.decrement(4)
  expect(pendingDataControl.size).toEqual(1)
})
