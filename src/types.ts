// TODO: Proper typing for ValueBag!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = any
export type CaminhoMapper = (valueBag: ValueBag) => ValueBag | Promise<ValueBag>
export type CaminhoGenerator = () => AsyncGenerator

export interface OperatorParams {
    fn: CaminhoMapper
    options?: {
        concurrency?: number
        batch?: {
        maxSize: number
        timeoutMs: number
        }
    }
    provides?: string
}

export interface OperatorProviderParams extends OperatorParams {
  provides: string
}
