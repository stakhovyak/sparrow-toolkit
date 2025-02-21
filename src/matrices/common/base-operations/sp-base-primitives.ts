import { IMatrix, MatrixOperator } from '../../matrix.interface'
import { CRS } from '../../crs-matrix.class'

/**
 * Operation of storing a sparse sub-matrix in another sparse matrix
 * B = A(p, q)
 */
export function spRef <T = number> (matrix: IMatrix<T>, ref: IMatrix<T> ): IMatrix<T> {
    throw new Error('Not implemented')
}

/**
 * Operation of assigning a sparse matrix to a sub-matrix of another sparse matrix.
 * B(p, q) = A
 * ! worth saying that SpAssign is the only key-primitive that mutates it's **sparse matrix operand** in it's general case
 * ! SpAsgn requires the matrix dimensions to match
 * ! Can be quite powerful and complex if we allow p and q to be arbitrary vectors of indices
 */
export function spAsgn <T = number> (matrix: IMatrix<T>, asgn: IMatrix<T>): IMatrix<T> {
    throw new Error('Not implemented')
}

/**
 * SpMV is the most widely used sparse matrix kernel, since it's a workhorse of iterative linear equation solvers
 * and eigenvalues computations.
 * ! A sparse matrix can be multiplied by a dense vector either on the right (y = A*x) or on the left (y' = x'*A)
 * For the lib, the default id from the right side of A
 */
export function SpMV <T = number> (matrix: IMatrix<T>, mv: IVector<T>): IMatrix<T> {
    throw new Error('Not implemented')
}

/**
 * SpAdd computes the sum of two sparse matrices of dimensions MxN.
 * ! SpAdd isn't limited to any summarizing operator, in fact anu point-wise scalar
 * operation between two sparse matrices falls into the primitive.
 * For example, it can be used with MIN operator which returns the minimum of two
 * operands, logical AND, logical OR, ordinary addition, subtraction, etc.
 */
export function spAdd <T = number, U = T> (a: IMatrix<T>, b: IMatrix<U>, operator: MatrixOperator<T, U> = AdditionMatrixOperator): IMatrix<T> {
    throw new Error('Not implemented')
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
 */
export function spGEMM <T = number, U = T> (operand1: IMatrix<T>, operand2: IMatrix<U>, options: {
    innerOrOuterProduct: 'inner' | 'outer', // todo; set 'inner' as default
    columnOrRowWise: 'column-wise' | 'row-wise' | 'none', // todo; set 'none' as default
}): IMatrix<T> {
    // todo; make key-function map to embed different code implementations
    //  in the base algorithm
    // because depending on options, the implementations of some parts of the algorithm may differ
    throw new Error('Not implemented')
}
