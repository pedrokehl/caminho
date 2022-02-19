import { Caminho } from './Caminho'
import type { SourceParams } from './operators/generator'
import type { CaminhoOptions } from './types'

export function from(sourceParams: SourceParams, caminhoOptions?: CaminhoOptions): Caminho {
  return new Caminho(sourceParams, caminhoOptions)
}
