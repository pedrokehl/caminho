import { ParentCaminhoImpl } from './implementations/ParentCaminhoImpl'
import type { SourceParams } from './operators/generator'
import type { CaminhoOptions } from './types'
import { ParentCaminho } from './interfaces/ParentCaminho'

export function from(sourceParams: SourceParams, caminhoOptions?: CaminhoOptions): ParentCaminho {
  return new ParentCaminhoImpl(sourceParams, caminhoOptions)
}
