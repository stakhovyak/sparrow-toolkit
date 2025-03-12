import { CSR } from '../interface/csr.interface'
import { MatrixCell } from '../interface/matrix.interface'

export const createCSRFromCells = <T extends number>(
    rowsNumber: number,
    colsNumber: number,
    cells: readonly MatrixCell<T>[],
): CSR<T> => {
    const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col)
    const rowPtrs = new Array(rowsNumber + 1).fill(0)
    const colIndices: number[] = []
    const values: T[] = []
    let currentRow = 0
    let currentIndex = 0
    rowPtrs[0] = 0

    for (const cell of sorted) {
        if (cell.row >= rowsNumber || cell.col >= colsNumber) {
            throw new Error('Cell position exceeds matrix dimensions')
        }

        while (currentRow < cell.row) {
            rowPtrs[currentRow + 1] = currentIndex
            currentRow++
        }

        colIndices.push(cell.col)
        values.push(cell.val)
        currentIndex++
    }

    while (currentRow < rowsNumber) {
        rowPtrs[currentRow + 1] = currentIndex
        currentRow++
    }

    return Object.freeze({
        rowsNumber,
        colsNumber,
        rowPtrs: Object.freeze(rowPtrs),
        colIns: Object.freeze(colIndices),
        values: Object.freeze(values),
    })
}

export const createCSRFromDiagonal = <T extends number>(diagonal: T[]) =>
    createCSRFromCells(
        diagonal.length,
        diagonal.length,
        diagonal.map((val, i) => ({
            row: i,
            col: i,
            val,
        })),
    )
