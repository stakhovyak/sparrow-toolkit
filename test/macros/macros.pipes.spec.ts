import { expandMiddleware, makePipe } from '../../src/pipe/pipe.create'
import { EventMap } from '../../src/pipe/pipe.types'
import { CSR } from '../../src/matrix/interface/csr.interface'
import { expandWith } from '../../src/pipe/macros/pipe.macros'
import { createCSRFromCells } from '../../src/matrix/factory/csr.create'
import { nonZeroCellsGet } from '../../src/matrix/lens/get/nonzero-cells.get'
import {
    combine,
    filter,
    map,
} from '../../src/matrix/operations/csr.operations'
import { MatrixCell } from '../../src/matrix/interface/matrix.interface'

describe('Testing macros for pipes', () => {
    // it('should work with expandWith', async () => {
    //     interface MatrixEvents extends EventMap {
    //         log: (msg: string) => void
    //         matrix_created: (matrix: CSR<number>) => void
    //     }
    //
    //     const matr = createCSRFromCells(4, 4, [
    //         { row: 0, col: 1, val: 10 },
    //         { row: 2, col: 0, val: 3 },
    //         { row: 1, col: 2, val: 5 },
    //         { row: 0, col: 3, val: 4 },
    //         { row: 3, col: 2, val: 6 },
    //         { row: 3, col: 3, val: 7 },
    //     ])
    //
    //     const res = await makePipe<MatrixEvents>()
    //         .use(
    //             expandWith(async ctx => {
    //                 const newVal = map(nonZeroCellsGet, cell => ({
    //                     ...cell,
    //                     val: cell.val + 10,
    //                 }))(ctx.init)
    //
    //                 const newNewVal = filter(
    //                     nonZeroCellsGet,
    //                     cell => cell.val > 5,
    //                 )(ctx.init)
    //
    //                 return { newVal, newNewVal }
    //             }),
    //         )
    //         .use(
    //             expandWith(async ctx => {
    //                 const bbb = combine(
    //                     nonZeroCellsGet,
    //                     nonZeroCellsGet,
    //                     (a, b) => a + b,
    //                     )(ctx.newVal, ctx.newNewVal)
    //                 return { bbb }
    //             }),
    //         )
    //         .execute({ init: matr })
    //     console.log(await res)
    //
    //     expect(res)
    // })

    it('should operate with csr', async () => {
        interface MathCSREvents extends EventMap {
            log: (msg: string) => void
            matrix_created: (matrix: CSR<number>) => void
        }
        // @ts-ignore
        const createCSRFromContext = expandMiddleware({
            name: 'createCSR',
            deps: ['width', 'height', 'cells'],
            provides: ['csr'],
            process: ctx => ({
                csr: createCSRFromCells(ctx.height, ctx.width, ctx.cells),
            }),
        })

        const createCSRFromArgs = (
            height: number,
            width: number,
            cells: MatrixCell<number>[],
        ) =>
            expandWith(
                c => {
                    const csr = createCSRFromCells(height, width, cells)

                    c.$events.emit(
                        'log',
                        `[LOG] supplied csr: rowPtrs: ${csr.rowPtrs}, cols: ${csr.colIns}, vals: ${csr.values}, nXn: ${csr.rowsNumber} | ${csr.colsNumber}`,
                    )

                    return { csr }
                },
            )

        const pipeline = makePipe<MathCSREvents>()
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
                expandWith(
                    async c => {
                        const mappedCsr = await map(nonZeroCellsGet, cell => ({
                            ...cell,
                            val: cell.val + 10,
                        }))(c.csr)

                        c.$events.emit(
                            'log',
                            `[LOG] mapThrough: rowPtrs: ${mappedCsr.rowPtrs}, cols: ${mappedCsr.colIns}, vals: ${mappedCsr.values}, nXn: ${mappedCsr.rowsNumber} | ${mappedCsr.colsNumber}`,
                        )

                        return { mappedCsr }
                    }
                )
            )
            .use(
                expandWith(
                    async c => {
                        const combinedCsr = await combine(
                            nonZeroCellsGet,
                            nonZeroCellsGet,
                            (a, b) => a + b,
                        )(c.csr, c.mappedCsr)

                        c.$events.emit(
                            'log',
                            `[LOG] combine: rowPtrs: ${combinedCsr.rowPtrs}, cols: ${combinedCsr.colIns}, vals: ${combinedCsr.values}, nXn: ${combinedCsr.rowsNumber} | ${combinedCsr.colsNumber}`,
                        )

                        return { combinedCsr }
                    }
                )
            )

        pipeline.events.on('log', message => {
            console.log(message)
        })

        pipeline.hooks.register('afterEach', ctx => {
            console.log(ctx)
        })

        const res = await pipeline.execute({})

        expect(res)
    })
})
