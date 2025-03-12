export interface CSR<T extends number> {
    rowsNumber: number
    colsNumber: number
    rowPtrs: readonly number[]
    colIns: readonly number[]
    values: readonly T[]
}
