import { combine, map, reduce } from '../matrices/operations/csr.operations'
import { CSR } from '../matrices/csr.interface'
import { MatrixCell } from '../matrices/matrix.interface'
import { allCellsGet } from '../matrices/getters/all-cells.get'
import { nonZeroCellsGet } from '../matrices/getters/nonzero-cells.get'

export const sumSCRWithGenerator =
    <T extends number>(
        generator: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
    ) =>
    (a: CSR<T>, b: CSR<T>) =>
        combine(generator, generator, (a: T, b: T) => a - b)(a, b)

export const sumCSR = <T extends number>(a: CSR<T>, b: CSR<T>) =>
    sumSCRWithGenerator(allCellsGet)(a, b)

export const subtractCSRWithGenerator =
    <T extends number>(
        generator: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
    ) =>
    (a: CSR<T>, b: CSR<T>) =>
        combine(generator, generator, (a: T, b: T) => a - b)(a, b)

export const subtractCSR = <T extends number>(a: CSR<T>, b: CSR<T>) =>
    subtractCSRWithGenerator(allCellsGet)(a, b)

// export const multiplyCSR = <T extends number>(
//     a: CSR<T>,
//     b: CSR<T>,
// ): Promise<CSR<number>> => {
//     const resultCells: MatrixCell<T>[] = []
//
//     for await (const cell of nonZeroCellsGet(a)) {
//     }
// }

const hadamardProductWithGenerator =
    <T extends number>(
        generator: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
    ) =>
    (a: CSR<T>, b: CSR<T>) =>
        combine(generator, generator, (a: T, b: T) => a * b)(a, b)

export const hadamardProduct = <T extends number>(a: CSR<T>, b: CSR<T>) =>
    hadamardProductWithGenerator(nonZeroCellsGet)(a, b)

export const transposeCSR = <T extends number>(csr: CSR<T>) =>
    map(nonZeroCellsGet, cell => ({
        row: cell.col,
        col: cell.row,
        val: cell.val,
    }))(csr)

export const matrixVectorMultiply = async <T extends number>(
    m: CSR<T>,
    v: T[],
): Promise<T[]> => {
    const result = new Array(m.rowsNumber).fill(0)
    for await (const cell of allCellsGet(m)) {
        result[cell.row] += cell.val * (v[cell.col] || (0 as T))
    }
    return result
}

export const traceCSR = <T extends number>(csr: CSR<T>) =>
    reduce(
        nonZeroCellsGet,
        (sum, cell) => (cell.row === cell.col ? (sum += cell.val) : sum),
        0,
    )(csr)

export const scaleCSR = <T extends number> (csr: CSR<T>, scalar: T)  =>
    map(
        nonZeroCellsGet,
        cell => ({
            ...cell,
            val: cell.val * scalar,
        })
    )(csr)

export const extractDiagonal = <T extends number> (csr: CSR<T>) =>
    reduce(
        nonZeroCellsGet,
        // todo; the fuck why type is any[] not T[]???????????????????????????????????????????????????????????
        (diag, cell) => {
            if (cell.row === cell.col) diag[cell.row] = cell.val
            return diag
        },
        new Array(csr.rowsNumber).fill(0 as T)
    )(csr)