import { CSR } from '../../src/matrices/csr-matrix.class'

describe('Testing CSR methods', () => {
    describe('map() operations', () => {
        let testMatrix: CSR<number>

        beforeEach(() => {
            testMatrix = new CSR().Factory.fromCells(3, 3, () => [
                { row: 0, col: 1, value: 1 },
                { row: 1, col: 0, value: 2 },
                { row: 1, col: 2, value: 3 },
                { row: 2, col: 1, value: 4 },
            ])
        })

        test('Sigmoid activation', () => {
            const activated = testMatrix.map(cell => {
                return 1 / (1 + Math.exp(-cell.value))
            })

            // Sigmoid of 1 ≈ 0.731, 2 ≈ 0.881, 3 ≈ 0.952, 4 ≈ 0.982
            expect(activated.values).toEqual(
                expect.arrayContaining([
                    expect.closeTo(0.731, 2),
                    expect.closeTo(0.881, 2),
                    expect.closeTo(0.952, 2),
                    expect.closeTo(0.982, 2),
                ]),
            )
        })

        test('Degree-based masking', () => {
            // Precompute degrees: row 0 (1), row 1 (2), row 2 (1)
            const degrees = new Map<number, number>([
                [0, 1], [1, 2], [2, 1],
            ])

            const masked = testMatrix.map(cell => {
                return degrees.get(cell.row)! >= 2 ? cell.value : 0
            })

            // Only row 1 values should remain
            expect(masked.values).toEqual([2, 3])
            expect(masked.rowPtrs).toEqual([0, 0, 2, 2])
        })

        test('Hadamard product', () => {
            const matrixB = new CSR().Factory.fromCells(3, 3, () => [
                { row: 0, col: 1, value: 2 },
                { row: 1, col: 0, value: 3 },
                { row: 2, col: 1, value: 0.5 },
            ])

            const product = testMatrix.map(cell => {
                const bVal = matrixB.get(cell.row, cell.col)
                return cell.value * (bVal || 0)
            })

            // Expected products: (1*2=2), (2*3=6), (4*0.5=2)
            expect(product.values).toEqual([2, 6, 2])
            expect(product.cols).toEqual([1, 0, 1])
        })

        test('Laplacian matrix construction', () => {
            // Original adjacency (undirected):
            // 0-1 (value 1), 1-2 (value 3)
            const degrees = new Map<number, number>([
                [0, 1], [1, 4], [2, 3], // Degree = sum of edge weights
            ])

            const laplacian = testMatrix.map(cell => {
                if (cell.row === cell.col) {
                    return degrees.get(cell.row)! - cell.value
                }
                return -cell.value
            })

            // In Laplacian test, expect exact order:
            expect(laplacian.values).toEqual([
                1,   // (0,0) - diagonal
                -1,  // (0,1)
                -2,  // (1,0)
                4,   // (1,1) - diagonal
                -3,  // (1,2)
                -4,  // (2,1)
                3,    // (2,2) - diagonal
            ])
        })

        test('Transition probability matrix', () => {
            const transition = testMatrix.map(cell => {
                const rowSum = testMatrix.getRow(cell.row).values.reduce((a, b) => a + b, 0)
                return rowSum > 0 ? cell.value / rowSum : 0
            })

            // Row 0 sum: 1 → 1/1 = 1
            // Row 1 sum: 2+3=5 → 2/5=0.4, 3/5=0.6
            // Row 2 sum: 4 → 4/4=1
            expect(transition.values).toEqual([
                1,    // (0,1)
                0.4,  // (1,0)
                0.6,  // (1,2)
                1,     // (2,1)
            ])
        })

        test('Thresholding operation', () => {
            const thresholded = testMatrix.map(cell =>
                cell.value > 2 ? cell.value : 0,
            )

            expect(thresholded.values).toEqual([3, 4])
            expect(thresholded.rowPtrs).toEqual([0, 0, 1, 2])
        })
    })
    describe('Edge cases', () => {
        test('Empty matrix mapping', () => {
            const empty = new CSR().Factory.fromCells(0, 0, () => [])
            const result = empty.map(cell => cell.value * 2)
            expect(result.values).toEqual([])
        })

        test('Full zero matrix after mapping', () => {
            const matrix = new CSR().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: 1 },
                { row: 1, col: 1, value: 2 },
            ])

            const zeroed = matrix.map(() => 0)
            expect(zeroed.values).toEqual([])
            expect(zeroed.rowPtrs).toEqual([0, 0, 0])
        })
    })
    describe('filter() operations', () => {
        let matrix: CSR<number>

        beforeEach(() => {
            matrix = new CSR().Factory.fromCells(3, 3, () => [
                { row: 0, col: 1, value: 2 }, { row: 1, col: 0, value: 3 },
                { row: 1, col: 2, value: 5 }, { row: 2, col: 1, value: 1 },
            ])
        })

        test('Threshold filtering (values ≥ 3)', () => {
            const filtered = matrix.filter(cell => cell.value >= 3)
            expect(filtered.values).toEqual([3, 5])
            expect(filtered.cols).toEqual([0, 2])
        })

        test('Structural filter (main diagonal)', () => {
            const diag = matrix.filter(cell => cell.row === cell.col)
            // Original has no diagonal entries → should be empty
            expect(diag.values).toEqual([])
        })
    })

    describe('embed() operations', () => {
        let baseMatrix: CSR<number>

        beforeEach(() => {
            // Common base matrix setup: 3x3 with two elements
            baseMatrix = new CSR<number>().Factory.fromCells(3, 3, () => [
                { row: 1, col: 1, value: 10 },
                { row: 2, col: 2, value: 20 },
            ])
        })

        test('should overlay target matrix with addition operator', () => {
            const target = new CSR<number>().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: 5 },
                { row: 1, col: 1, value: 5 },
            ])

            const result = baseMatrix.embed(
                target,
                [1, 1], // Position in base matrix
                (a, b) => ({ value: a.value + b.value }),
            )

            // Expected cells:
            // - (1,1): 10 + 5 = 15
            // - (2,2): 20 + 5 = 25
            // - (1,2): 5 (from target row 0, col 1)
            // - (2,1): 5 (from target row 1, col 0)
            expect(result.values).toEqual([15, 25])
            expect(result.cols).toEqual([1, 2, 1, 2])
            expect(result.rowPtrs).toEqual([0, 0, 2, 4])
            expect(result.rowsNum).toBe(3)
            expect(result.colsNum).toBe(3)
        })

        test('should expand matrix dimensions when embedding out of bounds', () => {
            const target = new CSR<number>().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: 100 },
            ])

            const result = baseMatrix.embed(target, [3, 3])

            expect(result.rowsNum).toBe(5)
            expect(result.colsNum).toBe(5)
            expect(result.values).toEqual([10, 20, 100])
            expect(result.cols).toEqual([1, 2, 3])
            expect(result.rowPtrs).toEqual([0, 0, 1, 2, 3, 3])
        })

        test('should use default replacement operator', () => {
            const target = new CSR<number>().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: 50 },
                { row: 1, col: 1, value: 60 },
            ])

            const result = baseMatrix.embed(target, [1, 1])

            expect(result.values).toEqual([50, 60])
            expect(result.cols).toEqual([1, 2])
            expect(result.rowPtrs).toEqual([0, 0, 1, 2])
        })

        test('should handle zero results by removing cells', () => {
            const target = new CSR<number>().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: -10 },
                { row: 1, col: 1, value: -20 },
            ])

            const result = baseMatrix.embed(
                target,
                [1, 1],
                (a, b) => ({ value: a.value + b.value }),
            )

            // Original values: 10 @ (1,1), 20 @ (2,2)
            // After operation: 10-10=0 (removed), 20-20=0 (removed)
            expect(result.values).toEqual([])
            expect(result.rowPtrs).toEqual([0, 0, 0, 0])
        })

        test('should combine non-overlapping matrices', () => {
            const target = new CSR<number>().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: 30 },
                { row: 1, col: 1, value: 40 },
            ])

            const result = baseMatrix.embed(target, [0, 0])

            expect(result.values).toEqual([30, 40, 20])
            expect(result.cols).toEqual([0, 1, 2])
            expect(result.rowPtrs).toEqual([0, 2, 3, 4])
            expect(result.rowsNum).toBe(3)
            expect(result.colsNum).toBe(3)
        })

        test('should handle empty target matrix', () => {
            const target = new CSR<number>().Factory.fromCells(0, 0, () => [])
            const result = baseMatrix.embed(target, [0, 0])

            expect(result.values).toEqual([10, 20])
            expect(result.rowsNum).toBe(3)
            expect(result.colsNum).toBe(3)
        })

        test('should handle complex custom operator', () => {
            const target = new CSR<number>().Factory.fromCells(2, 2, () => [
                { row: 0, col: 0, value: 8 },
                { row: 1, col: 1, value: 12 },
            ])

            const result = baseMatrix.embed(
                target,
                [1, 1],
                (a, b) => ({ value: Math.abs(a.value - b.value) * 2 }),
            )

            // (1,1): |10-8|*2 = 4
            // (2,2): |20-12|*2 = 16
            expect(result.values).toEqual([4, 16])
            expect(result.cols).toEqual([1, 2])
        })
    })
})