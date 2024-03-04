import type { onStepFinished, ValueBag } from '../types'

export type InternalOnStepFinished = (valueBags: ValueBag[], stepStartedAt: Date) => void

const stub = () => {}

export function getOnStepFinished(name: string, onStepFinished?: onStepFinished): InternalOnStepFinished {
  if (onStepFinished) {
    return function internalOnStepFinished(valueBags: ValueBag[], stepStartedAt: Date) {
      const now = Date.now()
      const tookMs = now - stepStartedAt.getTime()
      onStepFinished({ name, tookMs, valueBags, emitted: valueBags.length })
    }
  }
  return stub
}
