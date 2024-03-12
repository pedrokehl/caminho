import { type ValueBag, fromFn } from '../../src'

describe('fromFn', () => {
  test('Should call the subsequent functions of the flow with the provided item from the function', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ dataId: '1' })

    async function getBar(valueBag: ValueBag) {
      return valueBag.foo * 10
    }

    await fromFn({ fn: getBar, provides: 'bar' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .run({ foo: 5 })

    expect(fetchMock).toHaveBeenCalledWith({ foo: 5, bar: 50 })
  })

  test('Should call the subsequent functions of the flow with the provided item from the function', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ dataId: '1' })

    async function getBar(valueBag: ValueBag) {
      return valueBag.foo * 10
    }

    await fromFn({ fn: getBar, provides: 'bar' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .run({ foo: 5 })

    expect(fetchMock).toHaveBeenCalledWith({ foo: 5, bar: 50 })
  })
})
