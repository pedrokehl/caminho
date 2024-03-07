import { fromValue } from '../../src'

describe('fromValue', () => {
  test('Should call the subsequent functions of the flow with the provided item', async () => {
    const mapMock = jest.fn().mockReturnValue({ mappedData: 1 })
    const fetchMock = jest.fn().mockResolvedValue({ dataId: '1' })

    await fromValue({ item: { foo: 'bar' }, provides: 'item' })
      .pipe({ fn: fetchMock, provides: 'rawData' })
      .pipe({ fn: mapMock, provides: 'mappedData' })
      .run()

    expect(fetchMock).toHaveBeenCalledWith({ item: { foo: 'bar' } })
    expect(mapMock).toHaveBeenCalledWith({ item: { foo: 'bar' }, rawData: { dataId: '1' } })
  })
})
