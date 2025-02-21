/**
 * A single matrix cell
 */
// todo; how to change the structure of the interface depending on
//  the implementation of the matrix? because Triples and CRS have
//  different approached to the cell of matrix, or no??
export interface MatrixCell<T = number> {
    readonly row: number
    readonly col: number
    readonly value: T
}

/**
 * Core interface for a matrix
 * Methods return new matrix instances for immutable operations
 */
export interface IMatrix<T = number> {
    readonly rowsNum: number
    readonly colsNum: number

    /**
     * a getter of value at certain index
     * @param row row under which the value is placed
     * @param col col under which the value is placed
     */
    get(row: number, col: number): T

    /**
     * Transform every element in the matrix,
     * Optionally create a sparse version if options.sparse is true
     * @param fn the body of map function
     * @param options options
     */
    map<U>(
        fn: (value: T, row: number, col: number) => U,
        options?: { sparse?: boolean },
    ): IMatrix<U>

    /**
     * Filter the matrix cells
     * Elements failing the predicate may be dropped
     * @param predicate
     */
    filter(predicate: (value: T, row: number, col: number) => boolean): IMatrix<T>

    /**
     * Create a view into a subregion of the matrix at a given position
     * The returned matrix carries metadata
     * @param rowRange
     * @param colRange
     */
    submatrix(
        rowRange: [number, number],
        colRange: [number, number],
    ): IMatrix<T> & EmbeddedMatrix

    /**
     * Embed another matrix into this one at the given position.
     * @param target
     * @param position
     * @param strategy controls whether to overwrite or merge
     */
    embed(
        target: IMatrix<T>,
        position: [number, number],
        strategy?: 'overwrite' | 'merge',
    ): IMatrix<T>

    /**
     * pipe the matrix through a sequence of custom operators
     * This pattern lets you compose transformations (like laplacian for example)
     * @param operators
     */
    pipe<U>(...operators: MatrixOperator<any, any>[]): IMatrix<T>

    /**
     * Subscribe to reactive events from the matrix
     * @param subscriber
     */
    subscribe(subscriber: MatrixSubscriber<T>): () => void

    /**
     * Iterate only over non-zero or non-empty entries
     */
    nonZeroEntries(): () => Iterable<MatrixCell<T>>
}

/**
 * Extra metadata for matrices that are subregions
 */
export interface EmbeddedMatrix {
    readonly parent?: IMatrix<any>
    readonly offset: [number, number]
    readonly mask?: {
        rows: Set<number>
        cols: Set<number>
    }
}

/**
 * Factory interface to build matrices
 */
export interface MatrixFactory<T = number> {
    create(options: MatrixCreateOptions<T>): IMatrix<T>

    fromCells(cells: MatrixCell<T>[], rows: number, cols: (number)): IMatrix<T> // todo; by default cols == rows and vise versa if one not provided
    fromDense(array: T[][]): IMatrix<T>
}

/**
 * Options used when creating a new matrix
 */
export interface MatrixCreateOptions<T> {
    sparseThreshold?: number
    initializer?: (row: number, col: number) => T
}

/**
 * Reactive events emitted by matrix operations
 */
export type MatrixEvent<T> =
    | { type: 'data-change'; changes: MatrixCell<T>[] }
    | { type: 'shape-change'; newRows?: number; newCols: number }
    | { type: 'embedding-update'; source: IMatrix<T> }
    | { type: 'edge-visited'; source: MatrixCell<T> }
    | { type: 'vertex-visited'; source: MatrixCell<T> }

/**
 * Context passed along with events to allow propagation through nested matrices
 */
export interface EmbeddingContext {
    readonly depth: number
    readonly versionChain: symbol[]
    readonly inheritanceChain: IMatrix[]

    propagate(event: MatrixEvent<unknown>): void
}

export interface MatrixSubscriber<T = number> {
    notify(
        event: MatrixEvent<T>,
        matrix: IMatrix<T>,
        context: EmbeddingContext,
    ): void
}

export type MatrixOperator<T = number, U = number> = (
    source: IMatrix<T>,
) => IMatrix<U>

export interface LaplacianMatrix extends IMatrix<number>, LaplacianTag {

}
export interface SymmetricMatrix<T> extends IMatrix<unknown>, SymmetricTag {

}

/**
 * Represents the underlying CRS structure
 */
export type CRSType = {
    values: Float64Array
    collIndices: Int32Array
    rowPtr: Int32Array
}

/**
 * Represents the underlying Triples structure
 */
export type TriplesType = {
    values: Float64Array
    col: Int32Array
    row: Int32Array
}