import {
    EmbeddedMatrix, EmbeddingContext,
    IMatrix,
    LaplacianMatrix, MatrixCell, MatrixEvent,
    MatrixOperator,
    MatrixSubscriber,
    SymmetricMatrix,
} from './matrix.interface'

/**
 * The same as regular CRS, but a bit optimized, assuming it is symmetrical all this stuff
 */
export class LaplacianCRS implements LaplacianMatrix, SymmetricMatrix<any>{
    public readonly rowsNum: number
    public readonly colsNum: number
    public readonly values: Float64Array
    public readonly colIndices: Int32Array
    public readonly rowPtr: Int32Array

    private subscribers: MatrixSubscriber<number>[] = []

    constructor(
        values: Float64Array,
        colIndices: Int32Array,
        rowPtr: Int32Array,
        rows: number,
        cols: number,
    ) {
        this.values = values
        this.colsNum = cols
        this.rowsNum = rows
        this.rowPtr = rowPtr
        this.colIndices = colIndices
    }

    get(row: number, col: number): number {
        throw new Error('get() method not implemented.')
    }

    map<U>(
        fn: (value: number, row: number, col: number) => U,
        options?: { sparse?: boolean },
    ): IMatrix<U> {
        throw new Error('map() method is not implemented yet')
    }

    filter(
        predicate: (value: number, row: number, col: number) => boolean,
    ): IMatrix<number> {
        throw new Error('filter() method is not implemented yet')
    }

    submatrix(
        rowRange: [number, number],
        colTange: [number, number]
    ): IMatrix<number> & EmbeddedMatrix {
        throw new Error('method submatrix() is not implemented yet')
    }

    embed(
        sub: IMatrix<number>,
        position: [number, number],
        strategy: 'overwrite' | 'merge' = 'overwrite',
    ): IMatrix<number> & EmbeddedMatrix {
        throw new Error('embed() method is not implemented yet')
    }

    pipe<U>(...operators: MatrixOperator<any, any>[]): IMatrix<U> {
        throw new Error('pipe() method is not implemented yet')
    }

    nonZeroEntries(): () => Iterable<MatrixCell<number>> {
        throw new Error('nonZeroEntries() method is not implemented yet')
    }

    subscribe(subscriber: MatrixSubscriber<number>): () => void {
        this.subscribers.push(subscriber);

        return () => {
            const index = this.subscribers.indexOf(subscriber);
            if (index !== -1) {
                this.subscribers.splice(index, 1)
            }
        }
    }

    protected notifySubscribers(event: MatrixEvent<number>): void {
        const context: EmbeddingContext = {
            depth: 0,
            versionChain: [],
            inheritanceChain: [],
            propagate(event: MatrixEvent<unknown>) {
                // In full implementation, this could forward events upstream
            }
        }

        for (const subscriber of this.subscribers) {
            subscriber.notify(event, this, context)
        }
    }

    protected triggerDataChange(changes: MatrixCell<number>[]): void {
        const event: MatrixEvent<number> = { type: 'data-change', changes };
        this.notifySubscribers(event)
    }
}