import { getAsyncGeneratorFromArray, getAsyncGeneratorFromFn } from './utils/getAsyncGeneratorFromArray'
import { Caminho } from './Caminho'
import type { CaminhoOptions, ValueBag } from './types'

export type FromGeneratorParams<P extends string = string, V = ValueBag> = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: P
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * AsyncGenerator that will provide the values for the flow
   * It receives the initial values passed to the .run() method
   */
  fn: (initialBag: ValueBag) => AsyncGenerator<V>
}

/**
 * Starting point of a flow, returns a Caminho instance that will iterate over the asyncGenerator
 * The caminho flow defined will execute each step until the generator is done
 */
export function fromGenerator<P extends string, V>(
  fromParams: FromGeneratorParams<P, V>,
  caminhoOptions?: CaminhoOptions,
): Caminho<Record<P, V>> {
  return new Caminho(fromParams, caminhoOptions)
}

export type fromValueParams<P extends string = string, V = ValueBag> = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: P
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * Single item to bootstrap the new flow
   */
  item: V
}

/**
 * Starting point of a flow, returns a Caminho instance based on the provided value
 * The caminho flow defined will execute each step only once
 */
export function fromValue<P extends string, V>(
  fromValueParams: fromValueParams<P, V>,
  caminhoOptions?: CaminhoOptions,
): Caminho<Record<P, V>> {
  const { item, name, provides } = fromValueParams
  const generator = getAsyncGeneratorFromArray([item])
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromArrayParams<P extends string = string, V = ValueBag> = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: P
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * Array of items to execute the new flow
   */
  items: readonly V[]
}

/**
 * Starting point of a flow, returns a Caminho instance based on the provided array of values
 * The caminho flow defined will execute one time for each item in the array
 */
export function fromArray<P extends string, V>(
  fromArrayParams: FromArrayParams<P, V>,
  caminhoOptions?: CaminhoOptions,
): Caminho<Record<P, V>> {
  const { name, provides } = fromArrayParams
  const generator = getAsyncGeneratorFromArray(fromArrayParams.items as unknown[])
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromFnParams<P extends string = string, V = ValueBag> = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: P
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * Async function that will provide one value for the flow
   * It receives the initialBag passed to the .run() method
   */
  fn: (initialBag: ValueBag) => V
}

/**
 * Starting point of a flow, returns a Caminho instance based on the returned value of the `fn`
 * The caminho flow defined will execute each step only once
 * The fn provided will receive the initialBag passed in the `run()` method.
 */
export function fromFn<P extends string, V>(
  fromFnParams: FromFnParams<P, V>,
  caminhoOptions?: CaminhoOptions,
): Caminho<Record<P, Awaited<V>>> {
  const { name, provides, fn } = fromFnParams
  const generator = getAsyncGeneratorFromFn(fn)
  return new Caminho({ fn: generator, name: name ?? fn.name, provides }, caminhoOptions)
}
