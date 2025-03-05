export interface Matrix < T extends number> {
    colsNumber: number;
    rowsNumber: number;
    cells: () => MatrixCell<T>[]
}

export interface MatrixCell <T extends number> {
    col: number
    row: number
    val: T
}