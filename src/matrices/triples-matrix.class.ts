import { MatrixFactoryConstructor } from './matrix-factory-constructor.interface'
import {
    EmbeddedMatrix,
    EmbeddingContext,
    IMatrix,
    MatrixCell,
    MatrixEvent,
    MatrixOperator,
    MatrixSubscriber,
    Operateable,
} from './matrix.interface'

export interface TriplesMatrixCell<T extends number> extends MatrixCell<T> {
    col: number
    row: number
    value: T
}

export class TriplesMatrixCellOperateable<T extends number>
    implements TriplesMatrixCell<T>, Operateable<T>
{
    constructor(
        readonly col: number,
        readonly row: number,
        readonly value: T,
    ) {}

    mutate(
        target: TriplesMatrixCellOperateable<T>,
    ): TriplesMatrixCellOperateable<T> {
        return new TriplesMatrixCellOperateable(
            target.col,
            target.row,
            target.value,
        )
    }
}

export class Triples<T extends number> implements IMatrix<T> {
    private subscribers: MatrixSubscriber<T>[] = []

    constructor(
        public readonly rowsNum: number = 0,
        public readonly colsNum: number = 0,
        public readonly cells: TriplesMatrixCell<T>[] = [],
    ) {}

    Factory: MatrixFactoryConstructor<Triples<T>, T> = {
        fromArray: (array: () => T[]): Triples<T> => {
            let result: TriplesMatrixCell<T>[] = []
            array().forEach((val, index) => {
                if (!(val <= 0)) {
                    result.push({
                        col: index,
                        row: 0,
                        value: val,
                    })
                }
            })
            return new Triples(1, array().length, result)
        },
        from2DArray: (array: () => T[][]): Triples<T> => {
            let result: TriplesMatrixCell<T>[] = [] // todo; get the biggest value from height and length of the T[][]
            array().forEach((val, rowIndex) => {
                val.forEach((val, colIndex) => {
                    if (!(val <= 0)) {
                        result.push({
                            col: colIndex,
                            row: rowIndex,
                            value: val,
                        })
                    }
                })
            })
            return new Triples(array().length, array().length, result) // todo; how to get length and height of the T[][]?
        },
        fromCells: (
            cells: () => (MatrixCell<T> & { col: number; row: number })[],
        ): Triples<T> => {
            return new Triples(
                cells().reduce((prevCell, currCell) => {
                    return currCell.row < prevCell.row ? currCell : prevCell
                }).row,
                cells().reduce((prevCell, currCell) => {
                    return currCell.col < prevCell.col ? currCell : prevCell
                }).col,
                cells(),
            )
        },
    }

    get(row: number, col: number): T {
        const cell = this.cells.find(
            cell => cell.row === row && cell.col === col,
        )
        if (cell == undefined) {
            throw new Error(`Cell at row ${row}, col ${col} not found`)
        }
        return cell.value as T
    }

    getRow(row: number): Triples<T> {
        return this.Factory.fromArray((): T[] => {
            const arr: T[] = []
            arr.fill(0 as T)
            this.cells
                .filter(cell => cell.row === row)
                .forEach(cell => {
                    arr[cell.col] = cell.value as T
                })
            return arr
        })
    }

    getCol(col: number): Triples<T> {
        return this.Factory.fromArray((): T[] => {
            const arr: T[] = []
            arr.fill(0 as T)
            this.cells
                .filter(cell => cell.col === col)
                .forEach(cell => {
                    arr[cell.row] = cell.value as T
                })
            return arr
        })
    }

    map(fn: (cell: TriplesMatrixCell<T>) => TriplesMatrixCell<T>): Triples<T> {
        return this.Factory.fromCells(() => {
            return this.cells.map(cell => fn(cell))
        })
    }

    filter(predicate: (cell: TriplesMatrixCell<T>) => boolean): Triples<T> {
        return this.Factory.fromCells(() => {
            return this.cells.filter(cell => predicate(cell))
        })
    }

    submatrix(
        rowRange: [from: number, to: number],
        colRange: [from: number, to: number],
    ): Triples<T> & EmbeddedMatrix {
        return this.filter(cell => {
            return (
                cell.row >= rowRange[0] &&
                cell.row <= rowRange[1] &&
                cell.col >= colRange[0] &&
                cell.col <= colRange[1]
            )
        }) as Triples<T> & EmbeddedMatrix
    }

    submatrixByIndices(
        rows: Set<number>,
        cols: Set<number>,
    ): Triples<T> & EmbeddedMatrix {
        throw new Error('submatrixByIndices() is not implemented yet')
    }

    embed(
        target: Triples<T>,
        position: [row: number, col: number],
        transOperator: (
            originalCell: TriplesMatrixCellOperateable<T>,
            targetCell: TriplesMatrixCellOperateable<T>,
        ) => TriplesMatrixCell<T> = (originalCell, targetCell) =>
            originalCell.mutate(targetCell),
    ): Triples<T> {
        return this.Factory.fromCells(() => {
            const cellLookup = new Map<string, TriplesMatrixCell<T>>()
            this.cells.forEach(cell => {
                const key = `${cell.row},${cell.col}`
                cellLookup.set(key, cell)
            })

            target.cells.forEach(tCell => {
                const newRow = tCell.row + position[0]
                const newCol = tCell.col + position[1]
                const key = `${newRow},${newCol}`

                const original = cellLookup.get(key)
                const originalOp = original
                    ? new TriplesMatrixCellOperateable(
                          original.col,
                          original.row,
                          original.value,
                      )
                    : new TriplesMatrixCellOperateable(newCol, newRow, 0 as T)
                const targetOp = new TriplesMatrixCellOperateable(
                    newCol,
                    newRow,
                    tCell.value,
                )
                const combined = transOperator(originalOp, targetOp)
                if (combined.value > 0) {
                    cellLookup.set(key, combined)
                } else {
                    cellLookup.delete(key)
                }
            })

            return Array.from(cellLookup.values())
        })
    }

    pipe<U extends number>(
        ...operators: MatrixOperator<any, any>[]
    ): Triples<U> {
        throw new Error('pipe() method is not implemented yet')
    }

    nonZeroEntries(): Iterable<TriplesMatrixCell<T>> {
        return this.cells.filter(cell => cell.value !== 0)
    }

    subscribe(subscriber: MatrixSubscriber<T>): () => void {
        this.subscribers.push(subscriber)

        return () => {
            const index = this.subscribers.indexOf(subscriber)
            if (index !== -1) {
                this.subscribers.splice(index, 1)
            }
        }
    }

    protected notifySubscribers(event: MatrixEvent<T>): void {
        const context: EmbeddingContext<T> = {
            depth: 0,
            versionChain: [],
            inheritanceChain: [],
            propagate(event: MatrixEvent<T>) {
                // In full implementation, this could forward events upstream
            },
        }

        for (const subscriber of this.subscribers) {
            subscriber.notify(event, this, context)
        }
    }

    protected triggerDataChange(changes: MatrixCell<T>[]): void {
        const event: MatrixEvent<T> = { type: 'data-change', changes }
        this.notifySubscribers(event)
    }
}
