export class PendingDataControlInMemory implements PendingDataControl {
  public size = 0

  increment(value = 1): void {
    this.size += value
  }

  decrement(value = 1): void {
    this.size -= value
  }
}

export type PendingDataControl = {
  size: number
  increment: (value?: number) => void
  decrement: (value?: number) => void
}
