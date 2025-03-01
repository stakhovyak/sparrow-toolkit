import { IMatrix, MatrixCell } from './matrix.interface'

export interface MatrixFactoryConstructor<
    M extends IMatrix<T>,
    T extends number,
> {
    fromArray(array: () => T[]): M
    from2DArray(array: () => T[][]): M
    fromCells(rowsNum: number, colsNum: number, cells: () => MatrixCell<T>[]): M
}
