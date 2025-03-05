import { CSR } from '../csr.interface'
import { csrRowGet } from './csr-row.get'

export const cellValueGet = <T extends number>(
    csr: CSR<T>,
    row: number,
    col: number
) => async (): Promise<T> => {
    try {
        // Validate row existence first
        if (row < 0 || row >= csr.rowsNumber) return 0 as T;

        // Collect indexes safely
        const indexes: number[] = [];
        for await (const i of csrRowGet(csr, row)) {
            indexes.push(i);
        }

        // Handle empty row case
        if (indexes.length === 0) return 0 as T;

        // Type-safe array access with non-null assertion
        const firstIndex = indexes[0]!;  // We know indexes is not empty
        const lastIndex = indexes[indexes.length - 1]!;

        // Calculate slice boundaries
        const sliceStart = Math.max(0, firstIndex);
        const sliceEnd = Math.min(csr.colIns.length, lastIndex + 1);

        // Find column index safely
        const colSlice = csr.colIns.slice(sliceStart, sliceEnd);
        const colIndex = colSlice.indexOf(col);

        // Return value or 0 if not found
        // @ts-ignore
        return colIndex >= 0 ? csr.values[firstIndex + colIndex] : 0 as T;

    } catch (error) {
        return Promise.reject(error);
    }
};