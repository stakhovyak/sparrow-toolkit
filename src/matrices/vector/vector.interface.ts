export interface IVector<T extends number = number> {
    readonly length: number

    get(index: number): T
    axpy(alpha: T, x: IVector<T>): IVector<T>
    dot(x: IVector<T>): T
    nonZeroEntries(): Iterable<{ index: number, value: T }>
}