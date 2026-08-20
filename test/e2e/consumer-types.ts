/**
 * Compile-only consumer: the e2e runner copies this file to consumer-types.mts and
 * consumer-types.cts in the scratch project and type-checks both under nodenext,
 * proving the published types resolve for ESM and CommonJS consumers alike.
 */
import { fromArray, type CaminhoOptions } from 'caminho'

export async function typedFlow(options?: CaminhoOptions): Promise<number> {
  const result = await fromArray({ items: [1, 2, 3], provides: 'n' }, options)
    .pipe({ fn: (bag) => bag.n * 2, provides: 'double' })
    .reduce({ fn: (acc, bag) => acc + bag.double, seed: 0, provides: 'sum' })
    .run()

  // @ts-expect-error typed bags are closed, undeclared properties are not accessible
  void result.somethingElse

  return result.sum
}
