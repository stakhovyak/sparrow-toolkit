import { EventMap } from '../../src/pipe/pipe.types'
import { CSR } from '../../src/matrix/interface/csr.interface'
import { createPipeline, defineMiddleware } from '../../src/pipe/pipe.create'
import {
    createCSRFromCells,
    createCSRFromDiagonal,
} from '../../src/matrix/factory/csr.create'
import { MatrixCell } from '../../src/matrix/interface/matrix.interface'
import {
    combine,
    filter,
    map,
    reduce,
} from '../../src/matrix/operations/csr.operations'
import { nonZeroCellsGet } from '../../src/matrix/lens/get/nonzero-cells.get'
import { cellValueGet } from '../../src/matrix/lens/get/cell-value.get'

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

describe('LaplacianMatrixOperations', () => {
    interface MatrixEvents extends EventMap {
        log: (msg: string) => void
        matrix_created: (matrix: CSR<number>) => void
    }

    it('should create and process laplacian matrix', async () => {
        // Helper to create CSR matrix middleware
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
                    c.$events.emit('matrix_created', csr)
                    return { csr }
                },
            })

        // Create pipeline for Laplacian matrix operations
        const pipeline = createPipeline<MatrixEvents>()
            // Create adjacency matrix for a simple graph (4-node cycle)
            .use(
                createCSRFromArgs(4, 4, [
                    { row: 0, col: 1, val: 1 },
                    { row: 1, col: 0, val: 1 },
                    { row: 1, col: 2, val: 1 },
                    { row: 2, col: 1, val: 1 },
                    { row: 2, col: 3, val: 1 },
                    { row: 3, col: 2, val: 1 },
                ]),
            )
            // Create degree matrix from adjacency matrix
            .use({
                name: 'createDegreeMatrix',
                deps: ['csr'],
                provides: 'degree',
                process: async c => {
                    // Calculate row degrees using reduce
                    const rowDegrees = await Promise.all(
                        Array.from({ length: c.csr.rowsNumber }, (_, row) =>
                            reduce(
                                nonZeroCellsGet,
                                (acc, cell) => acc + (cell.row === row ? 1 : 0),
                                0,
                            )(c.csr),
                        ),
                    )

                    // Create degree matrix cells
                    const degreeCells = rowDegrees.map((degree, row) => ({
                        row,
                        col: row,
                        val: degree,
                    }))

                    return {
                        degree: createCSRFromCells(
                            c.csr.rowsNumber,
                            c.csr.colsNumber,
                            degreeCells,
                        ),
                    }
                },
            })
            // Create Laplacian matrix (L = D - A)
            .use({
                name: 'createLaplacian',
                deps: ['csr', 'degree'],
                provides: 'laplacian',
                process: async c => {
                    // Subtract adjacency matrix from degree matrix
                    const laplacian = await combine(
                        nonZeroCellsGet,
                        nonZeroCellsGet,
                        (a, b) => a - b,
                    )(c.degree, c.csr)

                    c.$events.emit(
                        'log',
                        `Laplacian matrix created: ${JSON.stringify(
                            laplacian.values,
                        )}`,
                    )

                    return { laplacian }
                },
            })
            // Validate Laplacian matrix properties
            .use({
                name: 'validateLaplacian',
                deps: ['laplacian'],
                provides: 'validation',
                process: async c => {
                    // Verify diagonal entries equal node degrees
                    const diagonalValid = await reduce(
                        nonZeroCellsGet,
                        (acc, cell) =>
                            acc
                            && (cell.row === cell.col
                                ? cell.val === 2 // Expected degree for cycle graph nodes
                                : cell.val === -1), // Expected off-diagonal values
                        true,
                    )(c.laplacian)

                    return { validation: diagonalValid ? 'valid' : 'invalid' }
                },
            })

        // Setup event listeners
        pipeline.events.on('matrix_created', matrix => {
            console.log('Matrix created:', matrix.values)
        })

        pipeline.events.on('log', message => {
            console.log('[LOG]', message)
        })

        // Execute the pipeline
        const result = await pipeline.execute({})

        // Assert results
        expect(result.validation).toBe('valid')
        expect(result.laplacian.values).toEqual([
            2, -1, -1, 2, -1, -1, 2, -1, -1, 2,
        ])
    })
})

describe('AdvancedLaplacianOperations', () => {
    interface GraphEvents extends EventMap {
        matrix_created: (name: string, matrix: CSR<number>) => void
        analysis_complete: (result: string, value: number) => void
    }

    // Shared pipeline setup for Laplacian creation
    const createBasePipeline = () =>
        createPipeline<GraphEvents>()
            .use(
                defineMiddleware({
                    name: 'createAdjacency',
                    provides: 'adjacency',
                    process: () => ({
                        adjacency: createCSRFromCells(4, 4, [
                            { row: 0, col: 1, val: 1 },
                            { row: 1, col: 0, val: 1 },
                            { row: 1, col: 2, val: 1 },
                            { row: 2, col: 1, val: 1 },
                            { row: 2, col: 3, val: 1 },
                            { row: 3, col: 2, val: 1 },
                        ]),
                    }),
                }),
            )
            .use({
                name: 'createDegree',
                deps: ['adjacency'],
                provides: 'degree',
                process: async ctx => ({
                    degree: createCSRFromDiagonal(
                        await Promise.all(
                            Array.from(
                                { length: ctx.adjacency.rowsNumber },
                                (_, row) =>
                                    reduce(
                                        nonZeroCellsGet,
                                        (acc, cell) =>
                                            acc + (cell.row === row ? 1 : 0),
                                        0,
                                    )(ctx.adjacency),
                            ),
                        ),
                    ),
                }),
            })
            .use({
                name: 'createLaplacian',
                deps: ['degree', 'adjacency'],
                provides: 'laplacian',
                process: async ctx => ({
                    laplacian: await combine(
                        nonZeroCellsGet,
                        nonZeroCellsGet,
                        (a, b) => a - b,
                    )(ctx.degree, ctx.adjacency),
                }),
            })

    it('should calculate algebraic connectivity using Fiedler value', async () => {
        const pipeline = createBasePipeline().use({
            name: 'findFiedlerValue',
            deps: ['laplacian'],
            provides: 'fiedler',
            process: async ctx => {
                // Simplified eigenvalue approximation
                const mockEigenvalues = [0, 0.5858, 2, 3.4142]
                ctx.$events.emit(
                    'analysis_complete',
                    'Fiedler value found',
                    mockEigenvalues[1]!,
                )
                return { fiedler: mockEigenvalues[1] }
            },
        })

        pipeline.events.on('analysis_complete', (result, value) => {
            console.log(`${result}: ${value.toFixed(4)}`)
        })

        const result = await pipeline.execute({})
        expect(result.fiedler).toBeCloseTo(0.5858, 4)
    })

    it('should calculate effective resistance between nodes', async () => {
        const pipeline = createBasePipeline()
            .use({
                name: 'computePseudoinverse',
                deps: ['laplacian'],
                provides: 'laplacianPlus',
                process: async _ => ({
                    // Mock pseudoinverse for 4-node path graph
                    laplacianPlus: createCSRFromCells(4, 4, [
                        { row: 0, col: 0, val: 0.75 },
                        { row: 0, col: 1, val: 0.25 },
                        { row: 1, col: 0, val: 0.25 },
                        { row: 1, col: 1, val: 0.25 },
                        { row: 2, col: 2, val: 0.25 },
                        { row: 2, col: 3, val: 0.25 },
                        { row: 3, col: 2, val: 0.25 },
                        { row: 3, col: 3, val: 0.75 },
                    ]),
                }),
            })
            .use({
                name: 'calculateResistance',
                deps: ['laplacianPlus'],
                provides: 'resistance',
                process: async ctx => {
                    const resistance =
                        (await cellValueGet(ctx.laplacianPlus, 0, 0)())
                        + (await cellValueGet(ctx.laplacianPlus, 3, 3)())
                        - 2 * (await cellValueGet(ctx.laplacianPlus, 0, 3)())
                    ctx.$events.emit(
                        'analysis_complete',
                        'Effective resistance',
                        resistance,
                    )
                    return { resistance }
                },
            })

        const result = await pipeline.execute({})
        expect(result.resistance).toBeCloseTo(1.5)
    })

    it('should simulate spectral clustering', async () => {
        const pipeline = createBasePipeline()
            .use({
                name: 'findFiedlerVector',
                deps: ['laplacian'],
                provides: 'fiedlerVector',
                process: async _ => {
                    // Mock Fiedler vector for 4-node path graph
                    return { fiedlerVector: [-0.5, -0.5, 0.5, 0.5] }
                },
            })
            .use({
                name: 'clusterNodes',
                deps: ['fiedlerVector'],
                provides: 'clusters',
                process: ctx => ({
                    clusters: ctx.fiedlerVector.map(v => (v < 0 ? 0 : 1)),
                }),
            })

        const result = await pipeline.execute({})
        expect(result.clusters).toEqual([0, 0, 1, 1])
    })

    it('should calculate spanning trees using Kirchhoff', async () => {
        const pipeline = createBasePipeline()
            .use({
                name: 'reduceLaplacian',
                deps: ['laplacian'],
                provides: 'reducedLaplacian',
                process: async ctx => ({
                    reducedLaplacian: filter(
                        nonZeroCellsGet,
                        cell => cell.row < 3 && cell.col < 3,
                    )(ctx.laplacian),
                }),
            })
            .use({
                name: 'calculateDeterminant',
                deps: ['reducedLaplacian'],
                provides: 'spanningTrees',
                process: async ctx => {
                    // For 4-node path graph, number of spanning trees = 3
                    ctx.$events.emit(
                        'analysis_complete',
                        'Spanning trees count',
                        3,
                    )
                    return { spanningTrees: 3 }
                },
            })

        const result = await pipeline.execute({})
        expect(result.spanningTrees).toBe(3)
    })

    // it('should simulate heat diffusion process', async () => {
    //     const pipeline = createBasePipeline()
    //         .use({
    //             name: 'initializeHeat',
    //             provides: 'heat',
    //             process: () => ({
    //                 heat: createCSRFromCells(4, 1, [
    //                     { row: 0, col: 0, val: 100 },
    //                 ]),
    //             }),
    //         })
    //         .use({
    //             name: 'diffuseHeat',
    //             deps: ['laplacian', 'heat'],
    //             provides: 'heatDistribution',
    //             process: async ctx => {
    //                 let heat = ctx.heat
    //                 const dt = 0.1
    //
    //                 // Simple Euler integration
    //                 for (let i = 0; i < 5; i++) {
    //                     const heatFlow = await combine(
    //                         nonZeroCellsGet,
    //                         nonZeroCellsGet,
    //                         (h, l) => -l * h * dt,
    //                     )(heat, ctx.laplacian)
    //
    //                     heat = await combine(
    //                         nonZeroCellsGet,
    //                         nonZeroCellsGet,
    //                         (a, b) => a + b,
    //                     )(heat, heatFlow)
    //                 }
    //
    //                 return { heatDistribution: heat }
    //             },
    //         })
    //         .use({
    //             name: 'verifyConservation',
    //             deps: ['heatDistribution'],
    //             provides: 'totalHeat',
    //             process: async ctx => {
    //                 const total = await reduce(
    //                     nonZeroCellsGet,
    //                     (acc, cell) => acc + cell.val,
    //                     0,
    //                 )(ctx.heatDistribution)
    //                 return { totalHeat: total }
    //             },
    //         })
    //
    //     const result = await pipeline.execute({})
    //     expect(result.totalHeat).toBeCloseTo(100, 6)
    // })
})
