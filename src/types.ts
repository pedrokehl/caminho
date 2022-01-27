// TODO: Proper typing for ValueBag!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ValueBag extends Record<string, any> {
  _uniqueId: number
}

export interface CaminhoOptions {
  onEachStep?: (params: OnEachStepParams) => void
}

export interface OnEachStepParams {
  name: string
  type: OperationType
  tookMs: number
  status: OperationStatus
}

export enum OperationType {
  GENERATE = 'generate',
  PIPE = 'pipe',
  BATCH = 'batch',
}

export enum OperationStatus {
  SUCCESS = 'success'
}
