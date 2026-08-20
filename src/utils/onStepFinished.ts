import { type OnStepFinished, type ValueBag } from '../types'

export type InternalOnStepFinished = (valueBags: ValueBag[], startedAtMs: number, error?: Error) => void

const stub = () => {}

export function getOnStepFinished(name: string, onStepFinished?: OnStepFinished): InternalOnStepFinished {
  if (onStepFinished) {
    return function internalOnStepFinished(valueBags: ValueBag[], startedAtMs: number, error?: Error) {
      const tookMs = Math.round(performance.now() - startedAtMs)
      onStepFinished({ name, tookMs, valueBags, emitted: valueBags.length, error })
    }
  }
  return stub
}
