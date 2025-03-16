import { EventMap } from '../../src/pipe/pipe.types'
import { CSR } from '../../src/matrix/interface/csr.interface'
import { createPipeline, defineMiddleware } from '../../src/pipe/pipe.create'
import { createCSRFromCells } from '../../src/matrix/factory/csr.create'
import { MatrixCell } from '../../src/matrix/interface/matrix.interface'
import { combine, map } from '../../src/matrix/operations/csr.operations'
import { nonZeroCellsGet } from '../../src/matrix/lens/get/nonzero-cells.get'

describe('MathPipes', () => {
    interface MathCSREvents extends EventMap {
        log: (msg: string) => void
        matrix_created: (matrix: CSR<number>) => void
    }

    it('should operate with csr', async () => {
        // @ts-ignore
        const createCSRFromContext = defineMiddleware({
            name: 'createCSR',
            deps: ['width', 'height', 'cells'],
            provides: 'csr',
            process: ctx => ({
                csr: createCSRFromCells(ctx.height, ctx.width, ctx.cells),
            }),
        })

        const createCSRFromArgs = (
            height: number,
            width: number,
            cells: MatrixCell<number>[],
        ) =>
            defineMiddleware({
                name: 'createCSR',
                provides: 'csr',
                process: c => {
                    const csr = createCSRFromCells(height, width, cells)

                    c.$events.emit(
                        'log',
                        `[LOG] supplied csr: rowPtrs: ${csr.rowPtrs}, cols: ${csr.colIns}, vals: ${csr.values}, nXn: ${csr.rowsNumber} | ${csr.colsNumber}`,
                    )

                    return { csr }
                },
            })

        const pipeline = createPipeline<MathCSREvents>()
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
            .use({
                name: 'mapThrough',
                deps: ['csr'],
                provides: 'mappedCsr',
                process: async c => {
                    const mappedCsr = await map(nonZeroCellsGet, cell => ({
                        ...cell,
                        val: cell.val + 10,
                    }))(c.csr)

                    c.$events.emit(
                        'log',
                        `[LOG] mapThrough: rowPtrs: ${mappedCsr.rowPtrs}, cols: ${mappedCsr.colIns}, vals: ${mappedCsr.values}, nXn: ${mappedCsr.rowsNumber} | ${mappedCsr.colsNumber}`,
                    )

                    return { mappedCsr }
                },
            })
            .use({
                name: 'combine',
                deps: ['csr', 'mappedCsr'],
                provides: 'combinedCsr',
                process: async c => {
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
                },
            })

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
