import { Observable } from 'rxjs'

/**
 * Buffers values until maxSize is reached or timeoutMs has passed since the first buffered value.
 * Unlike bufferTime, no timer runs while the buffer is empty and empty buffers are never emitted.
 */
export function bufferSizeOrTimeout<T>(maxSize: number, timeoutMs: number) {
  return function bufferOperator(source: Observable<T>): Observable<T[]> {
    return new Observable<T[]>((subscriber) => {
      let buffer: T[] = []
      let timer: ReturnType<typeof setTimeout> | undefined

      function stopTimer() {
        if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
      }

      function flush() {
        stopTimer()
        if (buffer.length > 0) {
          const batch = buffer
          buffer = []
          subscriber.next(batch)
        }
      }

      const subscription = source.subscribe({
        next(value) {
          buffer.push(value)
          if (buffer.length >= maxSize) {
            flush()
          } else if (timer === undefined) {
            timer = setTimeout(flush, timeoutMs)
          }
        },
        error(err) {
          stopTimer()
          subscriber.error(err)
        },
        complete() {
          flush()
          subscriber.complete()
        },
      })

      return () => {
        stopTimer()
        subscription.unsubscribe()
      }
    })
  }
}
