/**
 * Compile-only consumer: the e2e runner copies this file to consumer-types.mts and
 * consumer-types.cts in the scratch project and type-checks both under nodenext,
 * proving the published types resolve for ESM and CommonJS consumers alike.
 */
import { fromArray, type CaminhoOptions } from 'caminho'

/** true only when A and B are identical types */
type IsExactly<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

export async function typedFlow(options?: CaminhoOptions): Promise<number> {
  const result = await fromArray({ items: [1, 2, 3], provides: 'n' }, options)
    .pipe({ fn: (bag) => bag.n * 2, provides: 'double' })
    .reduce({ fn: (acc, bag) => acc + bag.double, seed: 0, provides: 'sum' })
    .run()

  // proves the bag is closed: exactly the declared properties, no index signature
  const resultTypeIsExactlyDeclared: IsExactly<typeof result, { sum: number }> = true
  void resultTypeIsExactlyDeclared

  return result.sum
}
