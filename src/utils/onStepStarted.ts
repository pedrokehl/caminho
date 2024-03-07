import type { OnStepStarted, ValueBag } from '../types'

export type InternalOnStepStarted = (valueBags: ValueBag[]) => void

const stub = () => {}

export function getOnStepStarted(name: string, onStepStarted: OnStepStarted = stub): InternalOnStepStarted {
  return function internalOnStepStarted(valueBags: ValueBag[]) {
    onStepStarted({ name, valueBags, received: valueBags.length })
  }
}
