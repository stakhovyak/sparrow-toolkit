import { CSR } from '../../src/matrices/csr-matrix.class'
import { IMatrix } from '../../src/matrices/matrix.interface'

describe('Testing CSR Matrix factory', () => {
    const arr1 = [3, 0, 0, 6, 0, 0, 4, 3, 0, 7]
    const arr2 = [0, 0, 2, 1, 0, 4, 2, 0, 0, 0, 9, 0, 0]

    let matrix1: IMatrix<number>
    let matrix2: IMatrix<number>
    let matrix3: IMatrix<number>
    beforeAll(() => {
        matrix1 = new CSR<number>().Factory.fromArray(() => arr1)
        matrix2 = new CSR<number>().Factory.fromArray(() => arr2)
        matrix3 = new CSR<number>().Factory.from2DArray(() => [
            [0, 2, 3, 5, 0, 0],
            [2, 0, 0, 0, 7, 0],
            [0, 0, 0, 1, 0, 2],
            [3, 0, 0, 1, 0, 0],
        ])
    })

    describe('fromArray() factory method, with matrix1 and matrix2', () => {
        it('should create a 1xN CSR matrix, with rowPtr containing only one element pointing at 1 col with 3', () => {
            expect(matrix1.cells[0]).toStrictEqual({
                rowPtr: 1,
                colIndices: 1,
                value: 3,
            })
            expect(matrix1.cells[1]).toStrictEqual({
                colIndices: 4,
                value: 6,
            })
        })
        it('should create a 1xN CSR matrix, with rowPtr containing only one element pointing at 1 3rdCol with 2', () => {
            expect(matrix2.cells[0]).toStrictEqual({
                rowPtr: 1,
                colIndices: 3,
                value: 2,
            })
            expect(matrix2.cells[1]).toStrictEqual({
                colIndices: 4,
                value: 1,
            })
            expect(matrix2.cells[2]).toStrictEqual({
                colIndices: 6,
                value: 4,
            })
            expect(matrix2.cells[3]).toStrictEqual({
                colIndices: 7,
                value: 2,
            })
        })
    })
    describe('from2DArray factory method,', () => {
        it('should create a 6x4 matrix with rowPtr = [1 4 6 8]', () => {
            expect(matrix3.colsNum).toBe(6)
            expect(matrix3.rowsNum).toBe(4)
            expect(matrix3.cells[0]).toStrictEqual({
                rowPtr: 1,
                colIndices: 2,
                value: 2,
            })
            expect(matrix3.cells[1]).toStrictEqual({
                rowPtr: 4,
                colIndices: 3,
                value: 3,
            })
            expect(matrix3.cells[2]).toStrictEqual({
                rowPtr: 6,
                colIndices: 4,
                value: 5,
            })
            expect(matrix3.cells[3]).toStrictEqual({
                rowPtr: 8,
                colIndices: 1,
                value: 2,
            })
            expect(matrix3.cells[4]).toStrictEqual({
                colIndices: 5,
                value: 7,
            })
            expect(matrix3.cells[5]).toStrictEqual({
                colIndices: 4,
                value: 1,
            })
            expect(matrix3.cells[6]).toStrictEqual({
                colIndices: 6,
                value: 2,
            })
            expect(matrix3.cells[7]).toStrictEqual({
                colIndices: 1,
                value: 3,
            })
            expect(matrix3.cells[8]).toStrictEqual({
                colIndices: 4,
                value: 1,
            })
        })
    })
    describe('fromCells factory method', () => {
        it('should correctly construct CSR from triples notation', () => {
            const matrix = new CSR().Factory.fromCells(2, 3,
                () => [
                    { row: 0, col: 1, value: 5 },
                    { row: 0, col: 2, value: 3 },
                    { row: 1, col: 0, value: 1 },
                ])

            expect(matrix.rowPtrs).toEqual([0, 2, 3])
            expect(matrix.cols).toEqual([1, 2, 0])
            expect(matrix.values).toEqual([5, 3, 1])
        })
        it('should sort and validate cell positions', () => {
            expect(() => new CSR().Factory.fromCells(3, 3, () => [
                { row: 2, col: 1, value: 5 },
                { row: 0, col: 3, value: 3 },
            ])).toThrow()
        })
    })
})
