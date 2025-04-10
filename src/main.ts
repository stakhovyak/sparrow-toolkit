import { BaseContext, EventMap } from './pipe/pipe.types'
import { CSR } from './matrix/interface/csr.interface'
import { MatrixCell } from './matrix/interface/matrix.interface'
import { Pipe } from './pipe/pipe'
import { createCSRFromCells } from './matrix/factory/csr.create'

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

pipeline.execute().then(console.log)