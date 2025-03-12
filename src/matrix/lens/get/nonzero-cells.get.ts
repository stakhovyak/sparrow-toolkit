import { CSR } from '../../interface/csr.interface'
import { MatrixCell } from '../../interface/matrix.interface'
import { csrRowGet } from './csr-row.get'

export const nonZeroCellsGet = async function* <T extends number>(
    csr: CSR<T>,
): AsyncGenerator<MatrixCell<T>> {
    for (let row = 0; row < csr.rowsNumber; row++) {
        try {
            for await (const i of csrRowGet(csr, row)) {
                const ci = csr.colIns[i]!
                const v = csr.values[i]!

                yield Object.freeze({
                    row,
                    col: ci,
                    val: v,
                })
            }
        } catch (error) {
            yield Promise.reject(error)
        }
    }
}
