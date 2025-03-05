import { createCSRFromCells } from '../../../src/matrices/factories/csr.create'
import { nonZeroCellsGet } from '../../../src/matrices/getters/nonzero-cells.get'
import { MatrixCell } from '../../../src/matrices/matrix.interface'
import { CSR } from '../../../src/matrices/csr.interface'
import { cellValueGet } from '../../../src/matrices/getters/cell-value.get'
import { allCellsGet } from '../../../src/matrices/getters/all-cells.get'

describe('Testing CSR Matrix getters', () => {
    const data: MatrixCell<number>[] = [
        { row: 0, col: 1, val: 5},
        { row: 0, col: 3, val: 1},
        { row: 0, col: 4, val: 7},
        { row: 0, col: 5, val: 9},
        { row: 0, col: 6, val: 11},
        { row: 1, col: 0, val: 7},
        { row: 1, col: 4, val: 2},
        { row: 1, col: 5, val: 4},
        { row: 2, col: 3, val: 4},
        { row: 2, col: 4, val: 1},
        { row: 4, col: 0, val: 11},
        { row: 4, col: 2, val: 11},
        { row: 4, col: 3, val: 7},
        { row: 5, col: 4, val: 1},
        { row: 6, col: 1, val: 9},
        { row: 6, col: 5, val: 10},
    ]

    const csr = createCSRFromCells(7, 7, data)

    describe('nonZeroCellsGet', () => {
        it('should return all non-zero cells', async () => {
            const generator = nonZeroCellsGet(csr);
            const result: MatrixCell<number>[] = [];

            try {
                for await (const cell of generator) {
                    result.push(cell);
                }
            } catch (error) {
                console.log(error);
            }

            expect(result).toHaveLength(data.length);
            expect(result).toEqual(expect.arrayContaining(data));
        });
    });
    describe('allCellsGet', () => {
        it('should return all cells with correct values', async () => {
            const generator = allCellsGet(csr);
            const result: MatrixCell<number>[] = [];

            try {
                for await (const cell of generator) {
                    result.push(cell);
                }
            } catch (error) {
                fail('Should not throw error');
            }

            // Verify matrix dimensions (7x7 = 49 cells)
            expect(result).toHaveLength(7 * 7);

            // Check some specific cells
            expect(result).toEqual(expect.arrayContaining(data))

            // Check zero values
            const zeroCell = result.find(c => c.row === 0 && c.col === 0);
            expect(zeroCell?.val).toBe(0);

            const edgeCell = result.find(c => c.row === 6 && c.col === 6);
            expect(edgeCell?.val).toBe(0);
        });
    });

    describe('cellValueGet', () => {
        it('should return correct values for existing cells', async () => {
            await expect(cellValueGet(csr, 0, 1)()).resolves.toBe(5);
            await expect(cellValueGet(csr, 6, 5)()).resolves.toBe(10);
        });

        it('should return 0 for non-existing cells', async () => {
            await expect(cellValueGet(csr, 0, 0)()).resolves.toBe(0);
            await expect(cellValueGet(csr, 3, 3)()).resolves.toBe(0);
        });

        it('should handle out-of-bounds rows', async () => {
            await expect(cellValueGet(csr, -1, 0)()).resolves.toBe(0);
            await expect(cellValueGet(csr, 7, 0)()).resolves.toBe(0);
        });

        it('should handle out-of-bounds columns', async () => {
            await expect(cellValueGet(csr, 0, -1)()).resolves.toBe(0);
            await expect(cellValueGet(csr, 0, 7)()).resolves.toBe(0);
        });
    });

    describe('error handling', () => {
        it('should throw for invalid CSR structure', async () => {
            const invalidCSR: CSR<number> = {
                rowsNumber: 2,
                colsNumber: 2,
                rowPtrs: [0, 1],
                colIns: [], // Invalid empty array
                values: []  // Invalid empty array
            };

            const generator = nonZeroCellsGet(invalidCSR);
            try {
                for await (const _ of generator) {}
                fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toMatch(/invalid CSR structure/i);
            }
        });
    });
})