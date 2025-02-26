import { IMatrix, MatrixCell, MatrixFactory } from '../../matrix.interface'
import { IVector } from '../../vector/vector.interface'

/**
 * Operation of storing a sparse sub-matrix in another sparse matrix
 * B = A(p, q)
 */
export function spRef<T extends number = number>(
    matrix: IMatrix<T>,
    rows: number[],
    cols: number[],
): IMatrix<T> {
    const rowSet = new Set(rows)
    const colSet = new Set(cols)

    return matrix.submatrixByIndices(rowSet, colSet)
}

/**
 * Operation of assigning a sparse matrix to a sub-matrix of another sparse matrix.
 * B(p, q) = A
 * ! worth saying that SpAssign is the only key-primitive that mutates it's **sparse matrix operand** in it's general case
 * ! SpAsgn requires the matrix dimensions to match
 * ! Can be quite powerful and complex if we allow p and q to be arbitrary vectors of indices
 * B(p, q) = A
 */
export function spAsgn<T extends number = number>(
    matrix: IMatrix<T>,
    source: IMatrix<T>,
    position: [number, number],
    strategy: 'overwrite' | 'merge' = 'overwrite',
): IMatrix<T> {
    return matrix.embed(source, position, strategy)
}

/**
 * SpMV is the most widely used sparse matrix kernel, since it's a workhorse of iterative linear equation solvers
 * and eigenvalues computations.
 * ! A sparse matrix can be multiplied by a dense vector either on the right (y = A*x) or on the left (y' = x'*A)
 * For the lib, the default id from the right side of A
 * ! Examples of essential algorithms with spMV: (page ranking, that means eigenvalues computations)
 * - breadth-first search
 * - Bellman-Ford algorithm for shortest path
 * - Prim's minimum spanning tree algorithm
 */
export function SpMV<T extends number = number>(
    matrix: IMatrix<T>,
    mvector: IMatrix<T>,
): IMatrix<T> {
    const result: T[] = []

    for (let i = 0; i <= matrix.rowsNum - 1; i += 1) {
        // returns non-zero matrix cells iterable from 1xn matrix which is row
        // in form like ({col: number, row: number, value: T} or ({col: number, rowPtr: number, value T})
        let sum = 0 as T
        for (const cell of matrix.getRow(i).nonZeroEntries()) {
            // todo; number is assignable to type T, but T cannot be instantiated with different subtype of constraint
            sum += (cell.value * mvector.get(cell.row, cell.col)) as T
        }
        result[i] = sum
    }
    return new MatrixFactory.fromArray(result)
}

/**
 * SpAdd computes the sum of two sparse matrices of dimensions MxN.
 * ! SpAdd isn't limited to any summarizing operator, in fact anu point-wise scalar
 * operation between two sparse matrices falls into the primitive.
 * For example, it can be used with MIN operator which returns the minimum of two
 * operands, logical AND, logical OR, ordinary addition, subtraction, etc.
 */
export function spAdd<T extends number = number>(
    a: IMatrix<T>,
    b: IMatrix<T>,
    operator: (a: T, b: T) => T = (a, b) => (a + b) as T,
): IMatrix<T> {
    return a
        .map((value, row, col) => {
            const bVal = b.get(row, col)
            return operator(value, bVal)
        })
        .filter(v => v !== 0)
}

/**
 * SpGEMM computes the sparse product C = AB, where the input matrices A belongs to S^MxK,
 * and B belongs to S^KxN, and are both sparse.
 * ! This is a common operation, used for operating on large graphs, used in graph contraction,
 * peer-pressure clustering, recursive formulations of all-pairs shortest path algorithms,
 * and breadth-first search from multiple source vertices.
 * ! The computation for matrix multiplication can be organized in many ways leading to
 * several formulations:
 * - InnerProductSpGEMM
 * - OuterProductSpGEMM
 * ! SpGEMM is also can be set up so that A and B are accessed by rows and columns,
 * computing one row/column product of C at a time.
 *
 * C:R^S(MxN) = InnerProuct-SpGEMM(A:R^S(MxK), B:R^S(KxN))
 * for i to M
 *   do for j = 1 to N
 *     do C(i,j) = A(i;:)*B(:;j)
 *
 * C:R^S(MxN) = OuterProuct-SpGEMM(A:R^S(MxK), B:R^S(KxN))
 * C = 0
 * for k = 1 to K
 *  do C = C + A(:;k)*B(k;:)
 *
 * C:R^S(MxN) = ColumnWise-SpGEMM(A:R^S(MxK), B:R^S(KxN))
 * for i = 1 to N
 *   do for K where B(k,j) !== 0
 *     do C(:;j) = C(:;j)+A(:;k)*B(k;j)
 *
 * C:R^S(MxN) = RowWise-SpGEMM(A:R^S(MxK), B:R^S(KxN))
 * for i = 1 to M
 *   do for K where B(i,k) !== 0
 *     do C(i;:) = C(i;:)+A(i;k)*B(k;:)
 */
export function rowWiseSpGEMM<T extends number = number, U extends number = T>(
    a: IMatrix<T>,
    b: IMatrix<U>,
): IMatrix<T> {
    const entries: MatrixCell<T>[] = []

    for (let i = 0; i < a.rowsNum; i += 1) {
        const rowAccumulator = new Map<number, T>()

        for (const { col: k, value: aVal } of a.getRow(i).nonZeroEntries()) {
            for (const { col: j, value: bVal } of b
                .getRow(k)
                .nonZeroEntries()) {
                const product = (aVal as T) * (bVal as U)
                rowAccumulator.set(
                    j,
                    ((rowAccumulator.get(j) || 0) + product) as T,
                )
            }
        }

        for (const [j, value] of rowAccumulator) {
            entries.push({ row: i, col: j, value })
        }
    }

    return new MatrixFactory<T>().fromCells(entries, a.rowsNum, b.colsNum)
}
