// TODO: Proper typing for ValueBag!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueBag = any
export type CaminhoMapper = (valueBag: ValueBag) => ValueBag | Promise<ValueBag>
export type CaminhoGenerator = () => AsyncGenerator
