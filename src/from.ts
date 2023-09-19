import { getAsyncGeneratorFromArray, getAsyncGeneratorFromFn } from './utils/getAsyncGeneratorFromArray'
import { Caminho } from './Caminho'
import type { GeneratorParams } from './operators/generator'
import type { CaminhoOptions, ValueBag } from './types'

export function from(fromParams: GeneratorParams, caminhoOptions?: CaminhoOptions): Caminho {
  return new Caminho(fromParams, caminhoOptions)
}

export interface FromItemParams {
  item: unknown
  provides: string
  name?: string
}

export function fromItem(fromItemParams: FromItemParams, caminhoOptions?: CaminhoOptions): Caminho {
  const generator = getAsyncGeneratorFromArray([fromItemParams.item])
  return new Caminho({ fn: generator, name: fromItemParams.name, provides: fromItemParams.provides }, caminhoOptions)
}

export interface FromArrayParams {
  items: unknown[]
  provides: string
  name?: string
}

export function fromArray(fromArrayParams: FromArrayParams, caminhoOptions?: CaminhoOptions): Caminho {
  const generator = getAsyncGeneratorFromArray(fromArrayParams.items)
  return new Caminho({ fn: generator, name: fromArrayParams.name, provides: fromArrayParams.provides }, caminhoOptions)
}

export interface FromFnParams {
  fn: (initialBag: ValueBag) => unknown
  provides: string
  name?: string
}

export function fromFn(fromFnParams: FromFnParams, caminhoOptions?: CaminhoOptions): Caminho {
  const generator = getAsyncGeneratorFromFn(fromFnParams.fn)
  return new Caminho({ fn: generator, name: fromFnParams.name, provides: fromFnParams.provides }, caminhoOptions)
}
