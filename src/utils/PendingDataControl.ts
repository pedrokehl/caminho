type Waiter = { bucketId: string, limit: number, resolve: () => void }

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
    this.admitWaiters()
  }

  destroyBucket(bucketId: string): void {
    const inBucket = this.buckets.get(bucketId) ?? 0
    this.size -= inBucket
    this.buckets.delete(bucketId)
    // the bucket's own waiters belong to a run being torn down, they must never admit an item
    this.waiters = this.waiters.filter((waiter) => waiter.bucketId !== bucketId)
    this.admitWaiters()
  }

  acquireSlot(bucketId: string, limit: number): Promise<void> {
    if (this.size < limit) {
      this.increment(bucketId)
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.waiters.push({ bucketId, limit, resolve })
    })
  }

  /**
  * Admission is atomic: the slot is counted synchronously before the waiter resolves,
  * so freeing one slot can never admit more than one waiting item.
  */
  private admitWaiters(): void {
    while (this.waiters.length > 0 && this.size < this.waiters[0].limit) {
      const waiter = this.waiters.shift() as Waiter
      this.increment(waiter.bucketId)
      waiter.resolve()
    }
  }
}

export type PendingDataControl = {
  size: number
  increment: (bucketId: string, value?: number) => void
  decrement: (bucketId: string, value?: number) => void
  destroyBucket: (bucketId: string) => void
  /**
  * Counts one item into the bucket as soon as the size is below the limit:
  * immediately when there is capacity, otherwise when a slot frees up (FIFO).
  * Resolves once the item is counted.
  */
  acquireSlot: (bucketId: string, limit: number) => Promise<void>
}
