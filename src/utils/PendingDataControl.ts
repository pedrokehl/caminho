type Waiter = { threshold: number, resolve: () => void }

export class PendingDataControlInMemory implements PendingDataControl {
  public size = 0
  private buckets = new Map<string, number>()
  private waiters: Waiter[] = []

  increment(bucketId: string, value = 1): void {
    this.size += value
    const current = this.buckets.get(bucketId) ?? 0
    this.buckets.set(bucketId, current + value)
  }

  decrement(bucketId: string, value = 1): void {
    this.size -= value
    const current = this.buckets.get(bucketId) ?? 0
    this.buckets.set(bucketId, current - value)
    this.notifyWaiters()
  }

  destroyBucket(bucketId: string): void {
    const inBucket = this.buckets.get(bucketId) ?? 0
    this.size -= inBucket
    this.buckets.delete(bucketId)
    this.notifyWaiters()
  }

  waitUntilBelow(threshold: number): Promise<void> {
    if (this.size < threshold) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.waiters.push({ threshold, resolve })
    })
  }

  private notifyWaiters(): void {
    if (this.waiters.length === 0) {
      return
    }
    this.waiters = this.waiters.filter((waiter) => {
      if (this.size < waiter.threshold) {
        waiter.resolve()
        return false
      }
      return true
    })
  }
}

export type PendingDataControl = {
  size: number
  increment: (bucketId: string, value?: number) => void
  decrement: (bucketId: string, value?: number) => void
  destroyBucket: (bucketId: string) => void
  /**
  * Resolves as soon as size drops below the provided threshold.
  * Resolves immediately when the size is already below it.
  */
  waitUntilBelow: (threshold: number) => Promise<void>
}
