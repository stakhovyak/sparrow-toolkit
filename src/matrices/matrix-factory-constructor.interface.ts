import { IMatrix, MatrixCell } from './matrix.interface'

export interface MatrixFactoryConstructor<
    M extends IMatrix<T>,
    T extends number,
> {
    fromArray(array: () => T[]): M
    fromDoubleArray(array: () => T[][]): M
    fromCells(cells: () => MatrixCell<T>[]): M
}
