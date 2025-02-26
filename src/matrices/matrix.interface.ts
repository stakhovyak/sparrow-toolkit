//  CRS matrix has rowPtr instead of row
export interface MatrixCell<T extends number> {
    readonly row: number
    readonly col: number
    readonly value: T
}

/**
 * Core interface for a matrix
 * Methods return new matrix instances for immutable operations
 */
export interface IMatrix<T extends number> {
    readonly rowsNum: number
    readonly colsNum: number
    readonly cells: MatrixCell<T>[]

    /**
     * a getter of value at certain index
     * @param row row under which the value is placed
     * @param col col under which the value is placed
     */
    get(row: number, col: number): T

    getRow(row: number): IMatrix<T>

    getCol(col: number): IMatrix<T>

    /**
     * Transform every element in the matrix,
     * Optionally create a sparse version if options.sparse is true
     * @param fn the body of map function
     */
    map(
        fn: (cell: MatrixCell<T>) => MatrixCell<T>,
    ): IMatrix<T>

    /**
     * Filter the matrix cells
     * Elements failing the predicate may be dropped
     * @param predicate
     */
    filter(predicate: (cell: MatrixCell<T>) => boolean): IMatrix<T>

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

    submatrixByIndices(
        rows: Set<number>,
        cols: Set<number>,
    ): IMatrix<T> & EmbeddedMatrix

    /**
     * Embed another matrix into this one at the given position.
     * @param target
     * @param position
     * @param transOperator
     */
    embed(
        target: IMatrix<T>,
        position: [number, number],
        transOperator?: (a: MatrixCell<T>, b: MatrixCell<T>) => MatrixCell<T>,
    ): IMatrix<T>

    /**
     * pipe the matrix through a sequence of custom operators
     * This pattern lets you compose transformations (like laplacian for example)
     * @param operators
     */
    pipe<U>(...operators: MatrixOperator<any, any>[]): IMatrix<T>

    /**
     * Iterate only over non-zero or non-empty entries
     */
    nonZeroEntries(): Iterable<MatrixCell<T>>

    /**
     * Subscribe to reactive events from the matrix
     * @param subscriber
     */
    subscribe(subscriber: MatrixSubscriber<T>): () => void
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
 * Reactive events emitted by matrix operations
 */
export type MatrixEvent<T extends number> =
    | { type: 'data-change'; changes: MatrixCell<T>[] }
    | { type: 'shape-change'; newRows?: number; newCols: number }
    | { type: 'embedding-update'; source: IMatrix<T> }
    | { type: 'edge-visited'; source: MatrixCell<T> }
    | { type: 'vertex-visited'; source: MatrixCell<T> }

/**
 * Context passed along with events to allow propagation through nested matrices
 */
export interface EmbeddingContext<T extends number> {
    readonly depth: number
    readonly versionChain: symbol[]
    readonly inheritanceChain: IMatrix<T>[]

    propagate(event: MatrixEvent<T>): void
}
export interface EmbeddingContext<T extends number> {
    readonly depth: number
    readonly versionChain: symbol[]
    readonly inheritanceChain: IMatrix<T>[]
}

export interface MatrixSubscriber<T extends number> {
    notify(
        event: MatrixEvent<T>,
        matrix: IMatrix<T>,
        context: EmbeddingContext<T>,
    ): void
}

export type MatrixOperator<T extends number, U extends number> = (
    source: IMatrix<T>,
) => IMatrix<U>

// /**
//  * Represents the underlying CRS structure
//  */
// export type CRSType = {
//     values: Float64Array
//     collIndices: Int32Array
//     rowPtr: Int32Array
// }
//
// /**
//  * Represents the underlying Triples structure
//  */
// export type TriplesType = {
//     values: Float64Array
//     col: Int32Array
//     row: Int32Array
// }
