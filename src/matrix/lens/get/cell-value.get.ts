import { CSR } from '../../interface/csr.interface'
import { csrRowGet } from './csr-row.get'

export const cellValueGet =
    <T extends number>(csr: CSR<T>, row: number, col: number) =>
    async (): Promise<T> => {
        try {
            if (row < 0 || row >= csr.rowsNumber) return 0 as T

            const indexes: number[] = []
            for await (const i of csrRowGet(csr, row)) {
                indexes.push(i)
            }

            if (indexes.length === 0) return 0 as T

            const firstIndex = indexes[0]! // We know indexes is not empty
            const lastIndex = indexes[indexes.length - 1]!

            const sliceStart = Math.max(0, firstIndex)
            const sliceEnd = Math.min(csr.colIns.length, lastIndex + 1)

            const colSlice = csr.colIns.slice(sliceStart, sliceEnd)
            const colIndex = colSlice.indexOf(col)

            // @ts-ignore
            return colIndex >= 0 ? csr.values[firstIndex + colIndex] : (0 as T)
        } catch (error) {
            return Promise.reject(error)
        }
    }
