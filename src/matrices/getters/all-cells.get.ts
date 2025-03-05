import { CSR } from '../csr.interface'
import { MatrixCell } from '../matrix.interface'
import { cellValueGet } from './cell-value.get'

export const allCellsGet =
    async function* <T extends number> (csr: CSR<T>): AsyncGenerator<MatrixCell<T>> {
        for (let row = 0; row < csr.rowsNumber; row++) {
            for (let col = 0; col < csr.colsNumber; col++) {
                try {
                    const val = await cellValueGet(csr, row, col)();
                    yield Object.freeze({ row, col, val });
                } catch (error) {
                    yield Promise.reject(error);
                }
            }
        }
    };