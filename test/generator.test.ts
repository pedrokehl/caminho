import { Caminho } from '../src/caminho'
import { sleep } from '../src/helpers/sleep'
import { OperationType } from '../src/operations/operations'
import { getMockedGenerator } from './mocks/getMockedGenerator'
import { mockStepResultForCallsCheck } from './mocks/mockStepCallResult'

test('Should call generator and run all function provided to the flow', async () => {
  const mapMock = jest.fn()
  const fetchMock = jest.fn()
  const NUMBER_OF_ITERATIONS = 50

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)

  await new Caminho()
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .map({ fn: mapMock, provides: 'mappedData' })
    .run()

  expect(fetchMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
  expect(mapMock).toBeCalledTimes(NUMBER_OF_ITERATIONS)
})

test('Should control maxItemsFlowing properly', async () => {
  const fetchMock = jest.fn().mockName('fetchMock').mockImplementation(() => sleep(10))
  const onEachStepMock = jest.fn().mockName('onEachStepLog')
  const NUMBER_OF_ITERATIONS = 7

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)

  await new Caminho({ onEachStep: onEachStepMock })
    .source({ fn: generatorMock, provides: 'job', maxItemsFlowing: 3 })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
  ])
})

test('Should emit values from generator uncontrolably if maxItemsFlowing was not provided', async () => {
  const fetchMock = jest.fn().mockName('fetchMock').mockImplementation(() => sleep(10))
  const onEachStepMock = jest.fn().mockName('onEachStepLog')
  const NUMBER_OF_ITERATIONS = 7

  const generatorMock = getMockedGenerator(NUMBER_OF_ITERATIONS)

  await new Caminho({ onEachStep: onEachStepMock })
    .source({ fn: generatorMock, provides: 'job' })
    .fetch({ fn: fetchMock, provides: 'rawData' })
    .run()

  expect(onEachStepMock.mock.calls).toEqual([
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.GENERATE),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
    mockStepResultForCallsCheck(OperationType.FETCH),
  ])
})
