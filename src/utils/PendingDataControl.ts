export class PendingDataControlInMemory implements PendingDataControl {
  public size = 0
  private buckets = new Map()

  increment(bucketId: string, value = 1): void {
    this.size += value
    const current = this.buckets.get(bucketId) ?? 0
    this.buckets.set(bucketId, current + value)
  }

  decrement(bucketId: string, value = 1): void {
    this.size -= value
    const current = this.buckets.get(bucketId)
    this.buckets.set(bucketId, current - value)
  }

  destroyBucket(bucketId: string) {
    const inBucket = this.buckets.get(bucketId) ?? 0
    this.size -= inBucket
    this.buckets.delete(bucketId)
  }
}

export type PendingDataControl = {
  size: number
  increment: (bucketId: string, value?: number) => void
  decrement: (bucketId: string, value?: number) => void
  destroyBucket: (bucketId: string) => void
}
