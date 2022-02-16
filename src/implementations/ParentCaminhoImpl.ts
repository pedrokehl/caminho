import { CaminhoOptions, CaminhoRunStats, ValueBag } from '../types'
import { SourceParams } from '../operators/generator'
import { ParentCaminho } from '../interfaces/ParentCaminho'
import { CaminhoAbstract } from './CaminhoAbstract'
import { getSubFrom } from '../subFrom'

export class ParentCaminhoImpl extends CaminhoAbstract implements ParentCaminho {
  protected subCaminhoFrom = getSubFrom(this.options)

  constructor(sourceOptions: SourceParams, protected options?: CaminhoOptions) {
    super(sourceOptions, options)
    this.subCaminhoFrom = this.subCaminhoFrom.bind(this)
  }

  public async run(initialBag: ValueBag = {}): Promise<CaminhoRunStats> {
    return new Promise((resolve) => {
      this.buildObservable(initialBag)
        .pipe(this.finalStep)
        .subscribe(() => {
          if (this.hasFinished(this.runStats)) {
            resolve(this.runStats as CaminhoRunStats)
          }
        })
    })
  }

  private hasFinished(runStats: CaminhoRunStats | null): boolean {
    return runStats !== null && this.pendingDataControl.size === 0
  }
}
