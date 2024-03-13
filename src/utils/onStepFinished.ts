import { type OnStepFinished, type ValueBag } from '../types'

export type InternalOnStepFinished = (valueBags: ValueBag[], stepStartedAt: Date, error?: Error) => void

const stub = () => {}

export function getOnStepFinished(name: string, onStepFinished?: OnStepFinished): InternalOnStepFinished {
  if (onStepFinished) {
    return function internalOnStepFinished(valueBags: ValueBag[], stepStartedAt: Date, error?: Error) {
      const now = Date.now()
      const tookMs = now - stepStartedAt.getTime()
      onStepFinished({ name, tookMs, valueBags, emitted: valueBags.length, error })
    }
  }
  return stub
}
