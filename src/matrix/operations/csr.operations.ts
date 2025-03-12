import { createCSRFromCells } from "../factory/csr.create"
import { CSR } from "../interface/csr.interface"
import { MatrixCell } from "../interface/matrix.interface"

export const map =
    <T extends number, U extends number>(
        generator: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
        transform: (cell: MatrixCell<T>) => MatrixCell<U>,
    ) =>
    async (csr: CSR<T>): Promise<CSR<U>> => {
        const cells: MatrixCell<U>[] = []

        try {
            for await (const cell of generator(csr)) {
                cells.push(transform(cell))
            }
        } catch (error) {
            return Promise.reject(error)
        }

        return createCSRFromCells(
            Math.max(csr.rowsNumber, Math.max(...cells.map(c => c.row))),
            Math.max(csr.colsNumber, Math.max(...cells.map(c => c.col))),
            cells,
        )
    }

export const filter =
    <T extends number>(
        generator: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
        predicate: (cell: MatrixCell<T>) => boolean,
    ) =>
    async (csr: CSR<T>): Promise<CSR<T>> => {
        const cells: MatrixCell<T>[] = []

        try {
            for await (const cell of generator(csr)) {
                if (predicate(cell)) cells.push(cell)
            }
        } catch (error) {
            return Promise.reject(error)
        }

        return createCSRFromCells(csr.rowsNumber, csr.colsNumber, cells)
    }

type MatrixReducer<T extends number, U> = (
    acc: U,
    cur: MatrixCell<T>,
    matrix: CSR<T>,
) => U

export const reduce =
    <T extends number, U>(
        generator: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
        reducer: MatrixReducer<T, U>,
        initial?: U,
    ) =>
    async (csr: CSR<T>): Promise<U> => {
        try {
            const gen = generator(csr)
            let accumulator: U
            let isFirstCell = initial === undefined

            if (initial !== undefined) {
                accumulator = initial
            } else {
                const first = await gen.next()
                if (first.done)
                    throw new Error(
                        'Reduce of empty matrix with no initial value',
                    )
                accumulator = first.value as unknown as U // Safe if U = MatrixCell<T>
                isFirstCell = false
            }

            for await (const cell of gen) {
                if (isFirstCell) {
                    isFirstCell = false
                    continue
                }
                accumulator = reducer(accumulator, cell, csr)
            }

            return accumulator
        } catch (error) {
            return Promise.reject(error)
        }
    }

export const combine =
    <T extends number, U extends number, V extends number>(
        generatorA: (csr: CSR<T>) => AsyncGenerator<MatrixCell<T>>,
        generatorB: (csr: CSR<U>) => AsyncGenerator<MatrixCell<U>>,
        combiner: (a: T, b: U) => V,
    ) =>
    async (csrA: CSR<T>, csrB: CSR<U>): Promise<CSR<V>> => {
        const cellMap = new Map<string, V>()

        for await (const cell of generatorA(csrA)) {
            const key = `${cell.row},${cell.col}`
            cellMap.set(key, combiner(cell.val, 0 as unknown as U))
        }

        for await (const cell of generatorB(csrB)) {
            const key = `${cell.row},${cell.col}`
            const existing = cellMap.get(key) ?? (0 as unknown as V)
            cellMap.set(key, combiner(existing as unknown as T, cell.val))
        }

        const cells = Array.from(cellMap.entries()).map(([key, val]) => {
            const [rowStr, colStr] = key.split(',')
            if (!rowStr || !colStr) {
                throw new Error(`Invalid cell key format: ${key}`)
            }

            const row = parseInt(rowStr, 10)
            const col = parseInt(colStr, 10)

            if (isNaN(row) || isNaN(col)) {
                throw new Error(`Invalid numeric coordinates in key: ${key}`)
            }

            return { row, col, val } as MatrixCell<V>
        })

        return createCSRFromCells(
            Math.max(csrA.rowsNumber, csrB.rowsNumber),
            Math.max(csrA.colsNumber, csrB.colsNumber),
            cells,
        )
    }
