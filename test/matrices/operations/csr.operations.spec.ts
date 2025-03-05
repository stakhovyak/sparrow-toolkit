import { MatrixCell } from '../../../src/matrices/matrix.interface'
import { createCSRFromCells } from '../../../src/matrices/factories/csr.create'
import {
    combine,
    filter,
    map,
    reduce,
} from '../../../src/matrices/operations/csr.operations'
import { nonZeroCellsGet } from '../../../src/matrices/getters/nonzero-cells.get'
import { CSR } from '../../../src/matrices/csr.interface'
import { composeMatrixOperators } from '../../../src/matrices/operations/csr.pipes'
// import { allCellsGet } from '../../../src/matrices/getters/all-cells.get'

describe('CSR Operations', () => {
    const testCells: MatrixCell<number>[] = [
        { row: 0, col: 1, val: 5 },
        { row: 0, col: 3, val: 1 },
        { row: 1, col: 0, val: 7 },
        { row: 2, col: 3, val: 4 },
        { row: 4, col: 0, val: 11 },
    ]

    const baseCSR = createCSRFromCells(5, 5, testCells)

    describe('map', () => {
        it('should apply transformation to all cells', async () => {
            const doubleValues = map(nonZeroCellsGet, cell => ({
                ...cell,
                val: cell.val * 2,
            }))

            const logValues = map(nonZeroCellsGet, cell => {
                console.log(
                    `row: ${cell.row}, col: ${cell.col}, val: ${cell.val}`,
                )
                return {
                    ...cell,
                }
            })

            const result = await doubleValues(baseCSR)
            await logValues(result)
            const expectedCells = testCells.map(c => ({ ...c, val: c.val * 2 }))

            expect(result.values).toEqual(expectedCells.map(c => c.val))
            expect(result.colIns).toEqual(expectedCells.map(c => c.col))
        })

        it('should handle empty matrix', async () => {
            const emptyCSR = createCSRFromCells(0, 0, [])
            const transform = map(nonZeroCellsGet, cell => cell)

            await expect(transform(emptyCSR)).resolves.toEqual(emptyCSR)
        })
    })

    describe('filter', () => {
        it('should filter cells based on predicate', async () => {
            const filterAbove5 = filter(nonZeroCellsGet, cell => cell.val > 5)
            const result = await filterAbove5(baseCSR)

            const logValues = map(nonZeroCellsGet, cell => {
                console.log(
                    `row: ${cell.row}, col: ${cell.col}, val: ${cell.val}`,
                )
                return {
                    ...cell,
                }
            })

            await logValues(result)

            // const expectedValues = [7, 11];
            // expect(result.values).toEqual(expectedValues);
            // expect(result.colIns).toEqual([0, 0]);
        })

        it('should return empty matrix when all cells filtered', async () => {
            const filterNone = filter(nonZeroCellsGet, () => false)
            const result = await filterNone(baseCSR)
            expect(result.values).toHaveLength(0)
            expect(result.rowPtrs).toEqual(new Array(6).fill(0))
        })
    })

    describe('reduce', () => {
        // 1. With initial value (returns number)
        const sumValues = reduce(
            nonZeroCellsGet,
            (sum, cell) => sum + cell.val,
            0, // initial value
        )

        // 2. Without initial value (returns MatrixCell<number>)
        const findMaxCell = reduce(
            nonZeroCellsGet,
            (maxCell: MatrixCell<number>, cell) =>
                cell.val > maxCell.val ? cell : maxCell,
        )

        // 3. Complex aggregation
        const matrixStats = reduce(
            nonZeroCellsGet,
            (stats, cell) => ({
                sum: stats.sum + cell.val,
                count: stats.count + 1,
                max: Math.max(stats.max, cell.val),
                min: Math.min(stats.min, cell.val),
            }),
            { sum: 0, count: 0, max: -Infinity, min: Infinity },
        )

        it('should use reduce and log', () => {
            sumValues(baseCSR).then(v => console.log(v))
            findMaxCell(baseCSR).then(v => console.log(v))
            matrixStats(baseCSR).then(v => console.log(v))
        })
    })

    describe('combine', () => {
        it('should compose laplacian matrix maker', () => {
            const degreeMatrix = <T extends number>(csr: CSR<T>) =>
                reduce(
                    nonZeroCellsGet,
                    (degrees, cell) => {
                        degrees[cell.row] = (degrees[cell.row] || 0) + 1
                        return degrees
                    },
                    {} as Record<number, number>,
                )(csr).then(degrees =>
                    createCSRFromCells(
                        csr.rowsNumber,
                        csr.colsNumber,
                        Object.entries(degrees).map(([row, count]) => ({
                            row: Number(row),
                            col: Number(row),
                            val: count,
                        })),
                    ),
                )
        })
    })

    describe('others', () => {
        const normalize = composeMatrixOperators(
            csr =>
                reduce(
                    nonZeroCellsGet,
                    (acc, cell) => ({
                        min: Math.min(acc.min, cell.val),
                        max: Math.max(acc.max, cell.val),
                    }),
                    { min: Infinity, max: -Infinity },
                )(csr).then(({ min, max }) =>
                    map(nonZeroCellsGet, c => ({
                        ...c,
                        val: (c.val - min) / (max - min),
                    }))(csr),
                ),
            filter(nonZeroCellsGet, c => c.val >= 0.5),
        )

        const matrixAdd = (other: CSR<number>) => (first: CSR<number>) =>
            combine(
                nonZeroCellsGet,
                nonZeroCellsGet,
                (a, b) => a + b,
            )(first, other)

        const addEmptyMatrix = matrixAdd(createCSRFromCells(5, 5, []))
        const result = addEmptyMatrix(createCSRFromCells(1, 2, []))

        const rowsSums = composeMatrixOperators(
            (csr: CSR<number>) =>
                reduce(
                    nonZeroCellsGet,
                    (sums, cell) => {
                        sums[cell.row] = (sums[cell.row] || 0) + cell.val
                        return sums
                    },
                    {} as Record<number, number>,
                )(csr),
            (sums: Record<number, number>) =>
                createCSRFromCells(
                    Object.keys(sums).length,
                    1,
                    Object.entries(sums).map(([row, sum]) => ({
                        row: Number(row),
                        col: 0,
                        val: sum,
                    })),
                ),
        )

        const computeDegreeMatrix = composeMatrixOperators(
            (adjacency: CSR<number>) =>
                reduce(
                    nonZeroCellsGet,
                    (degrees, cell) => {
                        degrees[cell.row] = (degrees[cell.row] || 0) + cell.val
                        return degrees
                    },
                    [] as number[],
                )(adjacency),
            (degrees: number[]) => createCSRFromDiagonal(degrees),
        )

        const computeLaplacian = composeMatrixOperators(
            (A: CSR<number>) => ({
                A,
                D: computeDegreeMatrix(A),
            }),
            ({ D, A }) => subtractCSR(await D, A)
        )

        const computeNormalizedLaplacian = composeMatrixOperators(
            computeDegreeMatrix,
            // Operator 1: Compute D^(-1/2)
            (D: CSR<number>) => {
                const DinvSqrtValues = D.values.map(val => 1 / Math.sqrt(val))
                return createCSRFromDiagonal(DinvSqrtValues)
            },
            // Operator 2: L = I - D⁻¹/2 A D⁻¹/2
            (DinvSqrt: CSR<number>, A: CSR<number>) => {
                const scaledA = multiplyCSR(DinvSqrt, multiplyCSR(A, DinvSqrt))
                return subtractCSR(identityMatrix(A.rowsNumber), scaledA)
            },
        )

        const spectralEmbedding = (k: number) =>
            composeMatrixOperators(
                computeNormalizedLaplacian,
                // Operator: Compute top-k eigenvectors (simplified)
                (L: CSR<number>) => {
                    const { eigenvectors } = approximateTopKEigenvectors(L, k)
                    return eigenvectorsToCSR(eigenvectors) // Stored as CSR rows
                },
            )

        const heatKernelFilter = (t: number) =>
            composeMatrixOperators(
                computeLaplacian,
                // Operator: Approximate matrix exponential (e.g., Chebyshev)
                (L: CSR<number>) => chebyshevApproximation(L, t, 10), // 10-term expansion
            )

        const computeResistanceDistance = composeMatrixOperators(
            computeLaplacian,
            // Operator: Compute pseudo-inverse L⁺
            (L: CSR<number>) => pseudoInverseCSR(L),
            // Operator: Extract resistance distances
            (Lplus: CSR<number>) => resistanceDistanceCSR(Lplus)
        );

    })
})
