import { CaminhoOptions } from './types'
import { SubCaminho } from './interfaces/SubCaminho'
import { SourceParams } from './operators/generator'
import { SubCaminhoImpl } from './implementations/SubCaminhoImpl'

export function getSubFrom(options?: CaminhoOptions) {
  return function subFrom(sourceParams: SourceParams): SubCaminho {
    return new SubCaminhoImpl(sourceParams, options)
  }
}
