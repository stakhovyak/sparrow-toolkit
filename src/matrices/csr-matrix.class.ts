import { MatrixFactoryConstructor } from './matrix-factory-constructor.interface'
import {
    EmbeddedMatrix,
    EmbeddingContext,
    IMatrix,
    MatrixCell, MatrixCellOperator, MatrixCellValue,
    MatrixEvent,
    MatrixOperator,
    MatrixSubscriber,
    Operateable,
} from './matrix.interface'

export interface CSRMatrixCell<T extends number> extends MatrixCell<T> {
    row: number
    col: number
    value: T
}

export class CSRMatrixCellOperateable<T extends number>
    implements CSRMatrixCell<T>, MatrixCellValue<T>
{
    constructor(
        public readonly row: number,
        public readonly col: number,
        public value: T,
    ) {}

    toValue(): MatrixCellValue<T> {
        return { value: this.value }
    }
}

export class CSR<T extends number> implements IMatrix<T> {
    private subscribers: MatrixSubscriber<T>[] = []

    constructor(
        public readonly rowsNum: number = 0,
        public readonly colsNum: number = 0,
        public readonly rowPtrs: number[] = [],
        public readonly cols: number[] = [],
        public readonly values: T[] = [],
        // ! do not use the field
        public readonly cells: MatrixCell<T>[] = [],
    ) {}

    Factory: MatrixFactoryConstructor<CSR<T>, T> = {
        fromArray: (array: () => T[]): CSR<T> => {
            let rowPtrs: number[] = []
            let cols: number[] = []
            let values: T[] = []

            array().forEach((el, index) => {
                if (el !== 0) {
                    cols.push(index)
                    values.push(el)
                }
            })
            rowPtrs.push(0)

            return new CSR(1, array().length, rowPtrs, cols, values)
        },
        from2DArray: (array: () => T[][]): CSR<T> => {
            let rowPtrs: number[] = []
            let cols: number[] = []
            let values: T[] = []

            let colsNum = array().reduce((prevArr, currArr) =>
                currArr > prevArr ? currArr : prevArr,
            ).length

            const makeAccumulator = (initial: number, rowsNum: number) => {
                let count = initial
                let tmp = rowsNum
                return {
                    get: (): number | false => (tmp > 0 ? count : false),
                    next: () => {
                        if (tmp > 0) count++
                    },
                    subtr: (): void => {
                        tmp--
                    },
                }
            }

            const accumulator = makeAccumulator(0, array().length)

            array().forEach((row) => {
                const currRowPtr = accumulator.get()
                row.forEach((el, colIndex) => {
                    if (el !== 0) {
                        cols.push(colIndex)
                        values.push(el)
                        accumulator.next()
                    }
                })
                if (currRowPtr) {
                    rowPtrs.push(currRowPtr)
                    accumulator.subtr()
                }
            })
            return new CSR(array().length, colsNum, rowPtrs, cols, values)
        },
        fromCells: (
            rowsNum: number,
            colsNum: number,
            cells: () => (MatrixCell<T> & {
                col: number
                row: number
            })[],
        ): CSR<T> => {
            const sortedCells = [...cells()].sort(
                (a, b) => a.row - b.row || a.col - b.col,
            )

            const rowPtrs: number[] = new Array(rowsNum + 1).fill(0)
            const cols: number[] = []
            const values: T[] = []
            let currentRow = 0
            let currentIndex = 0

            rowPtrs[0] = 0

            for (const cell of sortedCells) {
                if (cell.row >= rowsNum || cell.col >= colsNum) {
                    throw new Error('Cell position exceeds matrix dimensions')
                }

                while (currentRow < cell.row) {
                    rowPtrs[currentRow + 1] = currentIndex
                    currentRow++
                }

                cols.push(cell.col)
                values.push(cell.value)
                currentIndex++
            }

            while (currentRow < rowsNum) {
                rowPtrs[currentRow + 1] = currentIndex
                currentRow++
            }

            return new CSR(rowsNum, colsNum, rowPtrs, cols, values, sortedCells)
        },
    }

    get(row: number, col: number): T {
        const start = this.rowPtrs[row];
        const end = this.rowPtrs[row + 1];
        const indexInRow = this.cols.slice(start, end).findIndex(colv => colv === col);
        if (indexInRow === -1) return 0 as T;
        return this.values[start + indexInRow];
    }

    getCol(col: number): CSR<T> {
        let rowPtrs: number[] = []
        let cols: number[] = []
        let values: T[] = []
        let accumulator = 0

        this.rowPtrs.forEach((ptr, index) => {
            const value = this.values
                .slice(ptr, this.rowPtrs[index + 1] + 1 || this.rowPtrs.length)
                .find(
                    (_, index) =>
                        index === this.cols.findIndex(colv => colv === col),
                )

            if (value) {
                values.push(value)
                cols.push(col)
                rowPtrs.push(accumulator)
                accumulator++
            } else {
                rowPtrs.push(-1)
            }
        })

        return new CSR(this.rowsNum, 1, rowPtrs, cols, values)
    }

    getRow(row: number): CSR<T> {
        const start = this.rowPtrs[row];
        const end = this.rowPtrs[row + 1] ?? this.values.length;
        return new CSR(
            1,
            this.colsNum,
            [0, end - start],
            this.cols.slice(start, end),
            this.values.slice(start, end)
        );
    }

    map<U extends number>(fn: (cell: MatrixCell<T>) => U): CSR<U> {
        const newCells: MatrixCell<U>[] = []

        for (let row = 0; row < this.rowsNum; row++) {
            const rowStart = this.rowPtrs[row]
            const rowEnd =
                this.rowPtrs[row + 1] ?? this.rowPtrs[this.rowPtrs.length - 1]
            const existingValues = new Map<number, T>()
            for (let i = rowStart; i < rowEnd; i++) {
                existingValues.set(this.cols[i], this.values[i])
            }

            for (let col = 0; col < this.colsNum; col++) {
                const currentValue = existingValues.get(col) ?? (0 as T)
                const newValue = fn({ row, col, value: currentValue })

                if (newValue !== 0) {
                    newCells.push({ row, col, value: newValue })
                }
            }
        }

        return new CSR<U>().Factory.fromCells(
            this.rowsNum,
            this.colsNum,
            () => newCells as MatrixCell<U>[],
        )
    }

    filter(predicate: (cell: MatrixCell<T>) => boolean): CSR<T> {
        const newCells: MatrixCell<T>[] = [];
        for (let row = 0; row < this.rowsNum; row++) {
            const rowStart = this.rowPtrs[row];
            const rowEnd = this.rowPtrs[row + 1] ?? this.values.length;
            const existing = new Map<number, T>();
            for (let i = rowStart; i < rowEnd; i++) {
                existing.set(this.cols[i], this.values[i]);
            }
            for (let col = 0; col < this.colsNum; col++) {
                const current = existing.get(col) ?? (0 as T);
                if (predicate({ row, col, value: current }) && current !== 0) {
                    newCells.push({ row, col, value: current });
                }
            }
        }
        return new CSR<T>().Factory.fromCells(this.rowsNum, this.colsNum, () => newCells);
    }

    // embed(
    //     target: IMatrix<T>,
    //     position: [number, number],
    //     transOperator:
    //         MatrixCellOperator<T> = (a, b) => ({
    //         value: b.value as T
    //     })
    // ): CSR<T> {
    //     const combined = transOperator(
    //
    //     )
    //
    //     // Build a lookup keyed by "row,col" for the base matrix.
    //     const cellMap = new Map<string, CSRMatrixCellOperateable<T>>();
    //     for (let row = 0; row < this.rowsNum; row++) {
    //         const start = this.rowPtrs[row];
    //         const end = this.rowPtrs[row + 1] ?? this.values.length;
    //         for (let i = start; i < end; i++) {
    //             const col = this.cols[i];
    //             const key = `${row},${col}`;
    //             cellMap.set(key, new CSRMatrixCellOperateable(row, col, this.values[i]));
    //         }
    //     }
    //     // For every cell in the target, combine it with the base matrix.
    //     for (let row = 0; row < target.rowsNum; row++) {
    //         for (let col = 0; col < target.colsNum; col++) {
    //             const newRow = row + position[0];
    //             const newCol = col + position[1];
    //             const key = `${newRow},${newCol}`;
    //             const baseVal = cellMap.has(key) ? cellMap.get(key)!.value : (0 as T);
    //             const originalOp = new CSRMatrixCellOperateable(newRow, newCol, baseVal);
    //             const targetVal = target.get(row, col);
    //             const targetOp = new CSRMatrixCellOperateable(newRow, newCol, targetVal);
    //             const combined = transOperator(originalOp, targetOp);
    //             if (combined.value !== 0) {
    //                 cellMap.set(key, new CSRMatrixCellOperateable(newRow, newCol, combined.value));
    //             } else {
    //                 cellMap.delete(key);
    //             }
    //         }
    //     }
    //     // Determine new dimensions that cover both the base and embedded matrices.
    //     const newRows = Math.max(this.rowsNum, position[0] + target.rowsNum);
    //     const newCols = Math.max(this.colsNum, position[1] + target.colsNum);
    //     const newCells: MatrixCell<T>[] = [];
    //     for (const cell of cellMap.values()) {
    //         newCells.push({ row: cell.row, col: cell.col, value: cell.value });
    //     }
    //     return new CSR<T>().Factory.fromCells(newRows, newCols, () => newCells);
    // }

    // embed(
    //     target: IMatrix<T>,
    //     position: [number, number],
    //     transOperator: MatrixCellOperator<T> = (_, b) => ({ value: b.value })
    // ): CSR<T> {
    //     // Build a lookup keyed by "row,col" for the base matrix.
    //     const cellMap = new Map<string, CSRMatrixCellOperateable<T>>();
    //     for (let row = 0; row < this.rowsNum; row++) {
    //         const start = this.rowPtrs[row];
    //         const end = this.rowPtrs[row + 1] ?? this.values.length;
    //         for (let i = start; i < end; i++) {
    //             const col = this.cols[i];
    //             const key = `${row},${col}`;
    //             cellMap.set(key, new CSRMatrixCellOperateable(row, col, this.values[i]));
    //         }
    //     }
    //
    //     // For every cell in the target, combine it with the base matrix.
    //     for (let row = 0; row < target.rowsNum; row++) {
    //         for (let col = 0; col < target.colsNum; col++) {
    //             const newRow = row + position[0];
    //             const newCol = col + position[1];
    //             const key = `${newRow},${newCol}`;
    //
    //             // Retrieve the base value (or assume 0 if missing)
    //             const baseVal = cellMap.has(key) ? cellMap.get(key)!.value : (0 as T);
    //             // Retrieve the target value using the target's get() method.
    //             const targetVal = target.get(row, col);
    //
    //             // Apply the transformation operator.
    //             // Note: transOperator expects objects of type { value: T }
    //             const combined = transOperator({ value: baseVal }, { value: targetVal });
    //
    //             // Only store nonzero values.
    //             if (combined.value !== 0) {
    //                 cellMap.set(key, new CSRMatrixCellOperateable(newRow, newCol, combined.value));
    //             } else {
    //                 cellMap.delete(key);
    //             }
    //         }
    //     }
    //
    //     // Determine new dimensions covering both the base and embedded matrices.
    //     const newRows = Math.max(this.rowsNum, position[0] + target.rowsNum);
    //     const newCols = Math.max(this.colsNum, position[1] + target.colsNum);
    //     const newCells: MatrixCell<T>[] = [];
    //     for (const cell of cellMap.values()) {
    //         newCells.push({ row: cell.row, col: cell.col, value: cell.value });
    //     }
    //
    //     return new CSR<T>().Factory.fromCells(newRows, newCols, () => newCells);
    // }

    embed(
        target: IMatrix<T>,
        position: [number, number],
        transOperator: MatrixCellOperator<T> = (a, b) => ({ value: b.value })
    ): CSR<T> {
        // Build a lookup keyed by "row,col" for the base matrix.
        const cellMap = new Map<string, CSRMatrixCellOperateable<T>>();
        for (let row = 0; row < this.rowsNum; row++) {
            const start = this.rowPtrs[row];
            const end = this.rowPtrs[row + 1] ?? this.values.length;
            for (let i = start; i < end; i++) {
                const col = this.cols[i];
                const key = `${row},${col}`;
                cellMap.set(key, new CSRMatrixCellOperateable(row, col, this.values[i]));
            }
        }

        // For every coordinate in the target matrix (dense iteration),
        // retrieve its value via target.get(row, col) and combine it with the base matrix.
        for (let row = 0; row < target.rowsNum; row++) {
            for (let col = 0; col < target.colsNum; col++) {
                const newRow = row + position[0];
                const newCol = col + position[1];
                const key = `${newRow},${newCol}`;
                const baseVal = cellMap.has(key) ? cellMap.get(key)!.value : (0 as T);
                const targetVal = target.get(row, col); // will be 0 if not stored
                const combined = transOperator({ value: baseVal }, { value: targetVal });
                if (combined.value !== 0) {
                    cellMap.set(key, new CSRMatrixCellOperateable(newRow, newCol, combined.value));
                } else {
                    cellMap.delete(key);
                }
            }
        }

        // Determine new dimensions that cover both the base and embedded matrices.
        const newRows = Math.max(this.rowsNum, position[0] + target.rowsNum);
        const newCols = Math.max(this.colsNum, position[1] + target.colsNum);
        const newCells: MatrixCell<T>[] = [];
        for (const cell of cellMap.values()) {
            newCells.push({ row: cell.row, col: cell.col, value: cell.value });
        }
        return new CSR<T>().Factory.fromCells(newRows, newCols, () => newCells);
    }

    submatrix(
        rowRange: [from: number, to: number],
        colRange: [from: number, to: number],
    ): CSR<T> & EmbeddedMatrix {
        const [rowFrom, rowTo] = rowRange;
        const [colFrom, colTo] = colRange;
        const newRows = rowTo - rowFrom + 1;
        const newCols = colTo - colFrom + 1;
        const newCells: MatrixCell<T>[] = [];
        // Iterate only over rows in the given range.
        for (let row = rowFrom; row <= rowTo; row++) {
            const rowStart = this.rowPtrs[row];
            const rowEnd = this.rowPtrs[row + 1] ?? this.values.length;
            const existing = new Map<number, T>();
            for (let i = rowStart; i < rowEnd; i++) {
                existing.set(this.cols[i], this.values[i]);
            }
            for (let col = colFrom; col <= colTo; col++) {
                const current = existing.get(col) ?? (0 as T);
                if (current !== 0) {
                    newCells.push({ row: row - rowFrom, col: col - colFrom, value: current });
                }
            }
        }
        return new CSR<T>().Factory.fromCells(newRows, newCols, () => newCells) as CSR<T> & EmbeddedMatrix;
    }

    submatrixByIndices(
        rows: Set<number>,
        cols: Set<number>,
    ): CSR<T> & EmbeddedMatrix {
        throw new Error('submatrixByIndices() is not implemented yet')
    }

    pipe<U extends number>(...operators: MatrixOperator<any, any>[]): CSR<U> {
        throw new Error('pipe() method is not implemented yet')
    }

    nonZeroEntries(): Iterable<CSRMatrixCell<T>> {
        throw new Error('nonZeroEntries() method is not implemented yet')
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
