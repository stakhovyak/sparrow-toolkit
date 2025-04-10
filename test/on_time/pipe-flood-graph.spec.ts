import { createCSRFromCells } from '../../src/matrix/factory/csr.create'
import { BaseContext, EventMap } from '../../src/pipe/pipe.types'
import { CSR } from '../../src/matrix/interface/csr.interface'
import { Pipe } from '../../src/pipe/pipe'
import { map } from '../../src/matrix/operations/csr.operations'
import { nonZeroCellsGet } from '../../src/matrix/lens/get/nonzero-cells.get'
import { MatrixCell } from '../../src/matrix/interface/matrix.interface'

describe('this test has to check if the pipes are capable of handling time', () => {
    it('should perform basics', async () => {
        interface FloodEvents extends EventMap {
            log: (msg: string) => void
            matrix_created: (matrix: CSR<number>) => void
            edge_visited: (msg: string) => void
            branched: (power: number) => void
            dead: (msg: string) => void
        }

        const pipeline = Pipe.make<FloodEvents>()
            .use({
                floodInit: async _ => ({
                    csr: createCSRFromCells(4, 4, [
                        { row: 0, col: 1, val: 10 },
                        { row: 0, col: 3, val: 4 },
                        { row: 1, col: 2, val: 5 },
                        { row: 2, col: 0, val: 3 },
                        { row: 3, col: 2, val: 6 },
                        { row: 3, col: 3, val: 7 },
                    ])
                })
            })
            .use({
                processBranch1: c => ({
                    newA: c.csr.rowsNumber * 2
                }),
            })
            .use({
                processBranch2: async c => ({
                    newB: await map(nonZeroCellsGet, cell => ({
                        ...cell,
                        val: cell.val + c.newA
                    }))(c.csr),
                })
            })
            .use({
                logEvents: ctx => {
                    ctx.events.emit(
                        'log',
                        `newA: ${ctx.newA}, newB: ${ctx.newB.values}, csr: ${ctx.csr.values}`
                    )

                    return ctx
                }
            })
            .on('log', e => console.log(e))
            .on('edge_visited', event => console.log(event))

        const a = await pipeline.execute()

        expect(a)
    })
    it('should perform flood', async () => {
        interface FloodEvents extends EventMap {
            log: (msg: string) => void
            edge_visited: (msg: string) => void
        }

        const getConnectionsForVertex = (graph: CSR<number>, vertex: number): MatrixCell<number>[] => {
            const start = graph.rowPtrs[vertex]
            const end = graph.rowPtrs[vertex + 1]
            return Array.from({ length: end! - start! }, (_, i) => ({
                row: vertex,
                col: graph.colIns[start! + i],
                val: graph.values[start! + i]
            })) as MatrixCell<number>[]
        }

        const floodProcessor = (start: number, power: number) =>
            async (ctx: { csr: CSR<number> } & BaseContext) => {
                const traverse = async (current: number, remainingPower: number): Promise<void> => {
                    if (remainingPower <= 0) {
                        ctx.events.emit('log', `Out of power at ${current}`)
                        return
                    }

                    const connections = getConnectionsForVertex(ctx.csr, current)
                    if (connections.length === 0) {
                        ctx.events.emit('log', `No connections from ${current}`)
                        return
                    }

                    const powerPerConnection = Math.floor(remainingPower / connections.length)
                    await Promise.all(connections.map(async cell => {
                        const nextPower = powerPerConnection - cell.val
                        if (nextPower <= 0) return

                        await new Promise<void>(resolve => {
                            setTimeout(async () => {
                                ctx.events.emit('edge_visited', `From ${current} to ${cell.col}`)
                                await traverse(cell.col, nextPower)
                                resolve()
                            }, cell.val * 1000)
                        })
                    }))
                }

                await traverse(start, power)
                return { floodDone: true }
            }

        const pipeline = Pipe.make<FloodEvents>()
            .use({
                setupCSR: () => ({
                    csr: createCSRFromCells(4, 4, [
                        { row: 0, col: 1, val: 10 },
                        { row: 0, col: 3, val: 4 },
                        { row: 1, col: 2, val: 5 },
                        { row: 2, col: 0, val: 3 },
                        { row: 3, col: 2, val: 6 },
                        { row: 3, col: 3, val: 7 },
                    ])
                })
            })
            .use({
                flood: floodProcessor(0, 100)
            })
            .use({
                logger: ctx => {
                    ctx.events.emit('log', 'Flood process completed')
                    return { logged: true }
                }
            })
            .on('log', console.log)
            .on('edge_visited', console.log)

        const result = await pipeline.execute()

        expect(result.floodDone).toBe(true)
        expect(result.logged).toBe(true)
    })
})
