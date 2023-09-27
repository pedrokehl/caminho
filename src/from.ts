import { getAsyncGeneratorFromArray, getAsyncGeneratorFromFn } from './utils/getAsyncGeneratorFromArray'
import { Caminho } from './Caminho'
import type { GeneratorParams } from './operators/generator'
import type { CaminhoOptions, ValueBag } from './types'

export function from(fromParams: GeneratorParams, caminhoOptions?: CaminhoOptions): Caminho {
  return new Caminho(fromParams, caminhoOptions)
}

export type From = typeof from

export interface FromItemParams {
  item: unknown
  provides: string
  name?: string
}

export function fromItem({ item, name, provides }: FromItemParams, caminhoOptions?: CaminhoOptions): Caminho {
  const generator = getAsyncGeneratorFromArray([item])
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromItem = typeof fromItem

export interface FromArrayParams {
  items: unknown[]
  provides: string
  name?: string
}

export function fromArray({ items, provides, name }: FromArrayParams, caminhoOptions?: CaminhoOptions): Caminho {
  const generator = getAsyncGeneratorFromArray(items)
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromArray = typeof fromArray

export interface FromFnParams {
  fn: (initialBag: ValueBag) => unknown
  provides: string
  name?: string
}

export function fromFn({ fn, provides, name }: FromFnParams, caminhoOptions?: CaminhoOptions): Caminho {
  const generator = getAsyncGeneratorFromFn(fn)
  return new Caminho({ fn: generator, name: name ?? fn.name, provides }, caminhoOptions)
}

export type FromFn = typeof fromFn
