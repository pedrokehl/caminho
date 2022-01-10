import { from, Observable } from 'rxjs'
import { CaminhoGenerator, ValueBag } from '../types'

export function generate(
  asyncGeneratorFunction: CaminhoGenerator,
  provides: string,
): Observable<ValueBag> {
  async function* wrappedGenerator() {
    for await (const value of asyncGeneratorFunction()) {
      // TODO: add log for each emitted data
      yield { [provides]: value }
    }
    // TODO: Finish log
  }
  return from(wrappedGenerator())
}
