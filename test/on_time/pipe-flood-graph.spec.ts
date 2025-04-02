import { MatrixCell } from '../../src/matrix/interface/matrix.interface'
import { makePipe, expandMiddleware } from '../../src/pipe/pipe.create'
import { createCSRFromCells } from '../../src/matrix/factory/csr.create'
import { EventMap } from '../../src/pipe/pipe.types'
import { CSR } from '../../src/matrix/interface/csr.interface'

describe('this test has to check if the pipes are capable of handling time', () => {
    it('should dfsdfsfds', () => {
        interface FloodEvents extends EventMap {
            log: (msg: string) => void
            matrix_created: (matrix: CSR<number>) => void
            edge_visited: (msg: string) => void
            branched: (power: number) => void
            dead: (msg: string) => void
        }

        const createCSRFromArgs = (
            height: number,
            width: number,
            cells: MatrixCell<number>[],
        ) =>
            expandMiddleware({
                name: 'createCSR',
                provides: ['csr'],
                process: c => {
                    const csr = createCSRFromCells(height, width, cells)

                    c.$events.emit(
                        'log',
                        `[LOG] supplied csr: rowPtrs: ${csr.rowPtrs}, cols: ${csr.colIns}, vals: ${csr.values}, nXn: ${csr.rowsNumber} | ${csr.colsNumber}`,
                    )

                    return { csr }
                },
            })

        const getConnectionsForVertex = (graph: CSR<number>, vertex: number): MatrixCell<number>[] => {
            const start = graph.rowPtrs[vertex]
            const end = graph.rowPtrs[vertex + 1]

            return Array.from({ length: end! - start! }, (_, i) => ({
                row: vertex,
                col: graph.colIns[start! + i],
                val: graph.values[start! + i]
            })) as MatrixCell<number>[]
        }

        // const floodGraph = (start: number, power: number) =>
        //     expandMiddleware({
        //         name: 'graphFloodfill',
        //         deps: ['csr'],
        //         provides: [],
        //         process: async ctx => {
        //
        //             const traverse = async (current: number, remainingPower: number) => {
        //                 if (remainingPower <= 0) {
        //                     ctx.$events.emit(
        //                         'log',
        //                         `Out of power ${current} \n`
        //                     )
        //                 }
        //
        //                 const connections = getConnectionsForVertex(ctx.csr, current) // should give you a link to the row of the matrix representing graph vertex
        //
        //                 if (connections.length === 0) {
        //                     ctx.$events.emit(
        //                         'log',
        //                         `No connections from ${current} \n`
        //                     )
        //                 }
        //
        //                 const powerPerConnections = Math.floor(power / connections.length)
        //
        //                 await Promise.all(
        //                     connections.map(async (cell: MatrixCell<number>) => {
        //                         const connectionCost = cell.val
        //                         const nextNode = cell.col
        //
        //                         if (remainingPower >= connectionCost) {
        //                             const newPower = powerPerConnections
        //
        //                             setTimeout(async () => {
        //                                 ctx.$events.emit(
        //                                     'log',
        //                                     `From ${current} To ${nextNode}`
        //                                 )
        //
        //                                 await traverse(nextNode, newPower)
        //                             }, connectionCost * 1000)
        //                         }
        //                     })
        //                 )
        //             }
        //
        //             await traverse(start, power)
        //         }
        //     })

        const floodGraph = (start: number, power: number) =>
            expandMiddleware({
                name: 'graphFloodfill',
                deps: ['csr'],
                provides: [],
                process: async ctx => {
                    const traverse = async (
                        current: number,
                        remainingPower: number,
                    ): Promise<void> => {
                        if (remainingPower <= 0) {
                            ctx.$events.emit('log', `Out of power ${current} \n`);
                            return;
                        }

                        const connections = getConnectionsForVertex(ctx.csr, current);
                        if (connections.length === 0) {
                            ctx.$events.emit('log', `No connections from ${current} \n`);
                            return;
                        }

                        const powerPerConnection = Math.floor(remainingPower / connections.length);
                        await Promise.all(
                            connections.map(async (cell) => {
                                const connectionCost = cell.val;
                                const nextNode = cell.col;

                                if (remainingPower < connectionCost) return;

                                // Wrap setTimeout in a Promise to track completion
                                await new Promise<void>((resolve) => {
                                    setTimeout(async () => {
                                        ctx.$events.emit('log', `From ${current} To ${nextNode}`);
                                        await traverse(nextNode, powerPerConnection - connectionCost);
                                        resolve();
                                    }, connectionCost * 1000);
                                });
                            }),
                        );
                    };

                    await traverse(start, power);
                    return {}; // Correctly return an empty object
                },
            });

        const pipeline = makePipe<FloodEvents>()
            .use(
                createCSRFromArgs(4, 4, [
                    { row: 0, col: 1, val: 10 },
                    { row: 2, col: 0, val: 3 },
                    { row: 1, col: 2, val: 5 },
                    { row: 0, col: 3, val: 4 },
                    { row: 3, col: 2, val: 6 },
                    { row: 3, col: 3, val: 7 },
                ]),
            )
            .use(
                floodGraph(0, 100) // returns Promise<Promise<any>>, todo: <html>TS2345: Argument of type 'Middleware&lt;any, Promise&lt;any&gt;, {}&gt;' is not assignable to parameter of type 'Middleware&lt;Record&lt;string, unknown&gt; &amp; { csr: CSR&lt;number&gt;; }, Record&lt;string, unknown&gt;, FloodEvents&gt;'.<br/>The types returned by 'process(...)' are incompatible between these types.<br/>Type 'Promise&lt;any&gt; | Promise&lt;Promise&lt;any&gt;&gt;' is not assignable to type 'Record&lt;string, unknown&gt; | Promise&lt;Record&lt;string, unknown&gt;&gt;'.<br/>Type 'Promise&lt;Promise&lt;any&gt;&gt;' is not assignable to type 'Record&lt;string, unknown&gt; | Promise&lt;Record&lt;string, unknown&gt;&gt;'.<br/>Type 'Promise&lt;Promise&lt;any&gt;&gt;' is not assignable to type 'Promise&lt;Record&lt;string, unknown&gt;&gt;'.<br/>Type 'Promise&lt;any&gt;' is not assignable to type 'Record&lt;string, unknown&gt;'.<br/>Index signature for type 'string' is missing in type 'Promise&lt;any&gt;'.
            )
            .on('log', e => console.log(e))
            .on('edge_visited', event => console.log(event)) // todo; apparently you can't chain events what the fuck
    })
})
