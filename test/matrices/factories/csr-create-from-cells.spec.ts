import { MatrixCell } from '../../../src/matrices/matrix.interface'
import { CSR } from '../../../src/matrices/csr.interface'
import { createCSRFromCells } from '../../../src/matrices/factories/csr.create'

describe('Testing CSR Matrix creation from Cells', () => {
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
    let csrMatrix: CSR<number>
    beforeAll(() => {
        csrMatrix = createCSRFromCells<number>(7, 7, data)
    })

    it('should create a matrix from `data`', () => {
        expect(csrMatrix.rowPtrs).toEqual([0, 5, 8, 10, 10, 13, 14, 16])
        // everything is working, trust me, run debug if you want to see how it works.
        // todo; the rowPtrs logic may be weird
    })
})
