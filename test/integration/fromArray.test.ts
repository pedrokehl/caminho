import { fromArray } from '../../src'

describe('fromArray', () => {
  test('Should call the subsequent functions of the flow with the one provided item', async () => {
    const mapMock = jest.fn().mockReturnValue({ mappedData: 1 })
    const fetchMock = jest.fn().mockResolvedValue({ dataId: '1' })

    await fromArray({ items: [{ foo: 'bar' }], provides: 'item' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .pipe({ fn: mapMock, provides: 'mappedData' })
      .run()

    expect(fetchMock).toHaveBeenCalledWith({ item: { foo: 'bar' } })
    expect(mapMock).toHaveBeenCalledWith({ item: { foo: 'bar' }, rawData: { dataId: '1' } })
  })

  test('Should call the subsequent functions of the flow with the multiple provided item', async () => {
    const saveItem = jest.fn()

    const items = [
      { letter: 'A' },
      { letter: 'B' },
      { letter: 'C' },
      { letter: 'D' },
      { letter: 'E' },
      { letter: 'F' },
    ]

    await fromArray({ items, provides: 'item' })
      .pipe({ fn: saveItem })
      .run()

    expect(saveItem.mock.calls).toEqual([
      [{ item: { letter: 'A' } }],
      [{ item: { letter: 'B' } }],
      [{ item: { letter: 'C' } }],
      [{ item: { letter: 'D' } }],
      [{ item: { letter: 'E' } }],
      [{ item: { letter: 'F' } }],
    ])
  })
})
