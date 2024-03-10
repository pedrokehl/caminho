import { getAsyncGeneratorFromArray, getAsyncGeneratorFromFn } from './utils/getAsyncGeneratorFromArray'
import { Caminho } from './Caminho'
import type { CaminhoOptions, ValueBag } from './types'

export type FromGeneratorParams = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: string
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * AsyncGenerator that will provide the values for the flow
   * It receives the initial values passed to the .run() method
   */
  fn: (initialBag: ValueBag) => AsyncGenerator
}

/**
 * Starting point of a flow, returns a Caminho instance that will iterate over the asyncGenerator
 * The caminho flow defined will execute each step until the generator is done
 */
export function fromGenerator(fromParams: FromGeneratorParams, caminhoOptions?: CaminhoOptions): Caminho {
  return new Caminho(fromParams, caminhoOptions)
}

export type fromValueParams = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: string
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * Single item to bootstrap the new flow
   */
  item: unknown
}

/**
 * Starting point of a flow, returns a Caminho instance based on the provided value
 * The caminho flow defined will execute each step only once
 */
export function fromValue(fromValueParams: fromValueParams, caminhoOptions?: CaminhoOptions): Caminho {
  const { item, name, provides } = fromValueParams
  const generator = getAsyncGeneratorFromArray([item])
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromArrayParams = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: string
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * Array of items to execute the new flow
   */
  items: unknown[]
}

/**
 * Starting point of a flow, returns a Caminho instance based on the provided array of values
 * The caminho flow defined will execute one time for each item in the array
 */
export function fromArray(fromArrayParams: FromArrayParams, caminhoOptions?: CaminhoOptions): Caminho {
  const { name, provides } = fromArrayParams
  const generator = getAsyncGeneratorFromArray(fromArrayParams.items)
  return new Caminho({ fn: generator, name, provides }, caminhoOptions)
}

export type FromFnParams = {
  /**
   * The name of the property to be assigned to the cumulate context.
   * The value of the property is the returned value from the step.
   */
  provides: string
  /**
   * Name of the step, useful when logging the steps
   */
  name?: string
  /**
   * Async function that will provide one value for the flow
   * It receives the initialBag passed to the .run() method
   */
  fn: (initialBag: ValueBag) => unknown
}

/**
 * Starting point of a flow, returns a Caminho instance based on the returned value of the `fn`
 * The caminho flow defined will execute each step only once
 * The fn provided will receive the initialBag passed in the `run()` method.
 */
export function fromFn(fromFnParams: FromFnParams, caminhoOptions?: CaminhoOptions): Caminho {
  const { name, provides, fn } = fromFnParams
  const generator = getAsyncGeneratorFromFn(fn)
  return new Caminho({ fn: generator, name: name ?? fn.name, provides }, caminhoOptions)
}
