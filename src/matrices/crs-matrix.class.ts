import {
    EmbeddedMatrix,
    EmbeddingContext,
    IMatrix,
    MatrixCell,
    MatrixEvent,
    MatrixOperator,
    MatrixSubscriber,
} from './matrix.interface'

export class CRS <T = number> implements IMatrix<T> {
    public readonly rowsNum: number
    public readonly colsNum: number
    public readonly values: Float64Array
    public readonly colIndices: Int32Array
    public readonly rowPtr: Int32Array

    private subscribers: MatrixSubscriber<T>[] = []

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

    get(row: number, col: number): T {
        throw new Error('get() method not implemented.')
    }

    map<U>(
        fn: (value: T, row: number, col: number) => U,
        options?: { sparse?: boolean },
    ): IMatrix<U> {
        throw new Error('map() method is not implemented yet')
    }

    filter(
        predicate: (value: T, row: number, col: number) => boolean,
    ): IMatrix<T> {
        throw new Error('filter() method is not implemented yet')
    }

    submatrix(
        rowRange: [number, number],
        colTange: [number, number]
    ): IMatrix<T> & EmbeddedMatrix {
        throw new Error('method submatrix() is not implemented yet')
    }

    embed(
        sub: IMatrix<T>,
        position: [number, number],
        strategy: 'overwrite' | 'merge' = 'overwrite',
    ): IMatrix<T> & EmbeddedMatrix {
        throw new Error('embed() method is not implemented yet')
    }

    pipe<U>(...operators: MatrixOperator<any, any>[]): IMatrix<U> {
        throw new Error('pipe() method is not implemented yet')
    }

    nonZeroEntries(): () => Iterable<MatrixCell<T>> {
        throw new Error('nonZeroEntries() method is not implemented yet')
    }

    subscribe(subscriber: MatrixSubscriber<T>): () => void {
        this.subscribers.push(subscriber);

        return () => {
            const index = this.subscribers.indexOf(subscriber);
            if (index !== -1) {
                this.subscribers.splice(index, 1)
            }
        }
    }

    protected notifySubscribers(event: MatrixEvent<T>): void {
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

    protected triggerDataChange(changes: MatrixCell<T>[]): void {
        const event: MatrixEvent<T> = { type: 'data-change', changes };
        this.notifySubscribers(event)
    }
}