import { getAsyncGeneratorFromArray, getAsyncGeneratorFromFn } from './utils/getAsyncGeneratorFromArray'
import { Caminho } from './Caminho'
import type { CaminhoOptions, ValueBag } from './types'

export type FromGeneratorParams = {
  fn: (initialBag: ValueBag) => AsyncGenerator
  provides: string
  name?: string
}

export function fromGenerator(fromParams: FromGeneratorParams, caminhoOptions?: CaminhoOptions): Caminho {
  return new Caminho(fromParams, caminhoOptions)
}

export type fromValueParams = {
  item: unknown
  provides: string
  name?: string
}

export function fromValue(fromValueParams: fromValueParams, caminhoOptions?: CaminhoOptions): Caminho {
  const { item, name, provides } = fromValueParams
  const generator = getAsyncGeneratorFromArray([item])
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromArrayParams = {
  items: unknown[]
  provides: string
  name?: string
}

export function fromArray(fromArrayParams: FromArrayParams, caminhoOptions?: CaminhoOptions): Caminho {
  const { name, provides } = fromArrayParams
  const generator = getAsyncGeneratorFromArray(fromArrayParams.items)
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromFnParams = {
  fn: (initialBag: ValueBag) => unknown
  provides: string
  name?: string
}

export function fromFn(fromFnParams: FromFnParams, caminhoOptions?: CaminhoOptions): Caminho {
  const { name, provides, fn } = fromFnParams
  const generator = getAsyncGeneratorFromFn(fn)
  return new Caminho({ fn: generator, name: name ?? fn.name, provides }, caminhoOptions)
}
