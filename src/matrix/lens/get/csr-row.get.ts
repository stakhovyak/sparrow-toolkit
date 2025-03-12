import { CSR } from '../../interface/csr.interface'

export const csrRowGet =
    async function* <T extends number> (csr: CSR<T>, row: number): AsyncGenerator<number> {

        if (row < 0 || row >= csr.rowsNumber) {
            throw new Error(`Invalid row index: ${row}`)
        }

        const start = csr.rowPtrs[row]!

        const end = csr.rowPtrs[row + 1] ?? csr.values.length - 1

        if (start < 0 || start > csr.colIns.length) {
            throw new Error(`Invalid start index: ${start}`);
        }

        for (let i = start; i < end; i++) {
            yield i
        }
    }
