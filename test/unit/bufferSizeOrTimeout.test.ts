import { Subject, firstValueFrom, toArray } from 'rxjs'
import { bufferSizeOrTimeout } from '../../src/operators/helpers/bufferSizeOrTimeout'
import { sleep } from '../../src/utils/sleep'

describe('bufferSizeOrTimeout', () => {
  test('Should emit the buffer when maxSize is reached, without waiting for the timeout', async () => {
    const source = new Subject<number>()
    const emitted: number[][] = []
    const subscription = source.pipe(bufferSizeOrTimeout(2, 10_000)).subscribe((batch) => emitted.push(batch))

    source.next(1)
    source.next(2)
    source.next(3)
    expect(emitted).toEqual([[1, 2]])

    source.next(4)
    expect(emitted).toEqual([[1, 2], [3, 4]])
    subscription.unsubscribe()
  })

  test('Should emit a partial buffer once timeoutMs passed since the first buffered value', async () => {
    const source = new Subject<number>()
    const emitted: number[][] = []
    const subscription = source.pipe(bufferSizeOrTimeout(10, 10)).subscribe((batch) => emitted.push(batch))

    source.next(1)
    source.next(2)
    expect(emitted).toEqual([])

    await sleep(15)
    expect(emitted).toEqual([[1, 2]])
    subscription.unsubscribe()
  })

  test('Should not run a timer nor emit anything while no values are buffered', async () => {
    const source = new Subject<number>()
    const emitted: number[][] = []
    const subscription = source.pipe(bufferSizeOrTimeout(10, 5)).subscribe((batch) => emitted.push(batch))

    await sleep(20)
    expect(emitted).toEqual([])
    subscription.unsubscribe()
  })

  test('Should flush the remaining buffer on completion', async () => {
    const source = new Subject<number>()
    const collected = firstValueFrom(source.pipe(bufferSizeOrTimeout(10, 10_000)).pipe(toArray()))

    source.next(1)
    source.next(2)
    source.complete()

    expect(await collected).toEqual([[1, 2]])
  })

  test('Should propagate errors and drop the pending buffer', async () => {
    const source = new Subject<number>()
    const emitted: number[][] = []
    const errors: Error[] = []
    source.pipe(bufferSizeOrTimeout(10, 10_000)).subscribe({
      next: (batch) => emitted.push(batch),
      error: (err) => errors.push(err),
    })

    source.next(1)
    source.error(new Error('boom'))

    expect(emitted).toEqual([])
    expect(errors).toHaveLength(1)
    await sleep(1)
  })

  test('Should stop the pending timer when unsubscribed', async () => {
    const source = new Subject<number>()
    const emitted: number[][] = []
    const subscription = source.pipe(bufferSizeOrTimeout(10, 5)).subscribe((batch) => emitted.push(batch))

    source.next(1)
    subscription.unsubscribe()

    await sleep(15)
    expect(emitted).toEqual([])
  })
})
