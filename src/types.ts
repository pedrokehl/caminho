import type { BatchParams } from './operators/batch'
import type { PipeParams } from './operators/pipe'
import { InternalOnStepFinished } from './utils/onStepFinished'
import { InternalOnStepStarted } from './utils/onStepStarted'

// TODO: Proper typing for ValueBag!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = Record<string, any>

export type PipeGenericParams = PipeParams | BatchParams

export type onStepStarted = (params: onStepStartedParams) => void
export type onStepFinished = (params: onStepFinishedParams) => void

export interface onStepStartedParams {
  name: string
  received: number
  valueBags: ValueBag[]
}

export interface onStepFinishedParams {
  name: string
  tookMs: number
  emitted: number
  valueBags: ValueBag[]
}

export type Loggers = { onStepFinished: InternalOnStepFinished; onStepStarted: InternalOnStepStarted }

export interface CaminhoOptions {
  onStepFinished?: onStepFinished
  onStepStarted?: onStepStarted
  maxItemsFlowing?: number
}
