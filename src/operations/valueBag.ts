import { ValueBag } from '../types'

export function getNewValueBag(oldValueBag: ValueBag, toProvide: string, newValue: unknown) {
  return { ...oldValueBag, [toProvide]: newValue }
}
