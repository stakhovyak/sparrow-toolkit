import {
    Triples,
    TriplesMatrixCell,
    TriplesMatrixCellOperateable,
} from '../../src/matrices/triples-matrix.class'

describe('Triples Matrix', () => {
    describe('Factory.fromArray', () => {
        it('creates a matrix from an array and only stores positive (nonzero) values', () => {
            const arr = [1, 0, 2, 3]
            // Note: the Factory is not static, so we instantiate a dummy Triples to access it.
            const m = new Triples<number>(0, 0, []).Factory.fromArray(() => arr)
            expect(m.rowsNum).toBe(1)
            expect(m.colsNum).toBe(arr.length)
            // Only cells with positive values should be stored
            const stored = m.cells.map(cell => cell.value)
            expect(stored).toEqual(expect.arrayContaining([1, 2, 3]))
            expect(stored).not.toContain(0)
        })
    })

    describe('get()', () => {
        it('retrieves an existing cell value', () => {
            const arr = [1, 0, 2]
            const m = new Triples<number>(0, 0, []).Factory.fromArray(() => arr)
            expect(m.get(0, 0)).toBe(1)
            expect(m.get(0, 2)).toBe(2)
        })

        it('throws an error when a cell does not exist', () => {
            const arr = [1, 0, 2]
            const m = new Triples<number>(0, 0, []).Factory.fromArray(() => arr)
            expect(() => m.get(0, 1)).toThrow()
        })
    })

    describe('getRow()', () => {
        it('returns a matrix representing the requested row', () => {
            const arr = [1, 0, 2]
            const m = new Triples<number>(0, 0, []).Factory.fromArray(() => arr)
            const rowMatrix = m.getRow(0)
            // The factory creates a 1-row matrix from the array
            expect(rowMatrix.rowsNum).toBe(1)
            expect(rowMatrix.colsNum).toBe(m.colsNum)
            // Reconstruct the full row from the stored cells; missing positions are assumed zero.
            const rowValues = new Array(m.colsNum).fill(0)
            rowMatrix.cells.forEach(cell => {
                rowValues[cell.col] = cell.value
            })
            expect(rowValues).toEqual(arr)
        })
    })

    describe('getCol()', () => {
        it('returns a matrix representing the requested column', () => {
            // We manually create a 2-row matrix.
            const cells: TriplesMatrixCell<number>[] = [
                { row: 0, col: 0, value: 1 },
                { row: 0, col: 2, value: 2 },
                { row: 1, col: 1, value: 3 },
            ]
            // Create a matrix of 2 rows and 3 columns.
            const m = new Triples<number>(2, 3, cells)
            const colMatrix = m.getCol(2)
            // Note: The Factory.fromArray method (used in getCol) creates a 1-row matrix,
            // so here we reconstruct the column values manually.
            const colValues = new Array(m.rowsNum).fill(0)
            colMatrix.cells.forEach(cell => {
                // Here the cell.col in the returned matrix corresponds to the row index of m.
                colValues[cell.col] = cell.value
            })
            // In our base matrix, only row 0 has a value at col 2.
            expect(colValues).toEqual([2, 0])
        })
    })

    describe('map()', () => {
        it('applies a function to each cell, producing a new matrix', () => {
            const arr = [1, 0, 2]
            const m = new Triples<number>(0, 0, []).Factory.fromArray(() => arr)
            // Increase each stored cell's value by 10.
            const mapped = m.map(cell => ({
                ...cell,
                value: cell.value + 10,
            }))
            mapped.cells.forEach(cell => {
                expect(cell.value).toBeGreaterThanOrEqual(11)
            })
        })
    })

    describe('filter()', () => {
        it('filters out cells based on the predicate', () => {
            const arr = [1, 0, 2, 3]
            const m = new Triples<number>(0, 0, []).Factory.fromArray(() => arr)
            // Keep only cells with value greater than 2.
            const filtered = m.filter(cell => cell.value > 2)
            expect(filtered.cells.length).toBe(1)
            expect(filtered.cells[0].value).toBe(3)
        })
    })

    describe('embed()', () => {
        it('embeds a target matrix into the base matrix using the default transOperator', () => {
            // Base matrix: [1, 0, 2]
            const baseArr = [1, 0, 2]
            const base = new Triples<number>(0, 0, []).Factory.fromArray(
                () => baseArr,
            )
            // Target matrix: [0, 4] -> only positive value is stored (at index 1)
            const targetArr = [0, 4]
            const target = new Triples<number>(0, 0, []).Factory.fromArray(
                () => targetArr,
            )
            // Embed target into base at position [0, 1]
            const embedded = base.embed(target, [0, 1])
            // In this scenario:
            // • Base has cell (0,0)=1 and (0,2)=2.
            // • Target has cell (0,1)=4 which is mapped to (0,2) in the base.
            // With the default transOperator, the target cell overwrites the original.
            expect(embedded.get(0, 0)).toBe(1)
            expect(embedded.get(0, 2)).toBe(4)
            expect(() => embedded.get(0, 1)).toThrow()
        })

        it('embeds using a custom transOperator that sums values', () => {
            // Base matrix: [1, 2, 3]
            const baseArr = [1, 2, 3]
            const base = new Triples<number>(0, 0, []).Factory.fromArray(
                () => baseArr,
            )
            // Target matrix: [4, 0, 5] -> only cells with positive values are stored
            const targetArr = [4, 0, 5]
            const target = new Triples<number>(0, 0, []).Factory.fromArray(
                () => targetArr,
            )
            // Custom operator: add original and target values.
            const customOp = (
                original: TriplesMatrixCellOperateable<number>,
                targetCell: TriplesMatrixCellOperateable<number>,
            ) =>
                new TriplesMatrixCellOperateable(
                    targetCell.col,
                    targetCell.row,
                    original.value + targetCell.value,
                )
            // Embed target at position [0, 0]
            const embedded = base.embed(target, [0, 0], customOp)
            // Expected outcome:
            // • At (0,0): 1 + 4 = 5
            // • At (0,1): remains 2 (since target cell is 0 and not stored)
            // • At (0,2): 3 + 5 = 8
            expect(embedded.get(0, 0)).toBe(5)
            expect(embedded.get(0, 1)).toBe(2)
            expect(embedded.get(0, 2)).toBe(8)
        })
    })

    describe('submatrix()', () => {
        it('extracts a submatrix from the given row and column ranges', () => {
            // Manually create a 3x3 matrix with several cells.
            const cells: TriplesMatrixCell<number>[] = [
                { row: 0, col: 0, value: 1 },
                { row: 0, col: 1, value: 2 },
                { row: 1, col: 0, value: 3 },
                { row: 1, col: 1, value: 4 },
                { row: 2, col: 2, value: 5 },
            ]
            const m = new Triples<number>(3, 3, cells)
            // Extract submatrix covering rows 0 to 1 and cols 0 to 1.
            const sub = m.submatrix([0, 1], [0, 1])
            // Expect the submatrix to have exactly the four cells within that range.
            const expected = [
                { row: 0, col: 0, value: 1 },
                { row: 0, col: 1, value: 2 },
                { row: 1, col: 0, value: 3 },
                { row: 1, col: 1, value: 4 },
            ]
            expect(sub.cells).toHaveLength(expected.length)
            expected.forEach(expCell => {
                expect(sub.cells).toEqual(
                    expect.arrayContaining([expect.objectContaining(expCell)]),
                )
            })
        })
    })
})
