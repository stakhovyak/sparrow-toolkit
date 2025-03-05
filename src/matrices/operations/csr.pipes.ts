import { CSR } from '../csr.interface'

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type PipeArgs<T extends any[]> = {
    [K in keyof T]: K extends keyof [any, ...any[]]
        ? (arg: UnwrapPromise<T[K]>) => T[K]
        : never
}

export const pipe =
    <T extends any[]>(...fns: PipeArgs<T>) =>
    (initial: T[0] extends Promise<infer U> ? U : T[0]) => {
        return fns.reduce((prevPromise, fn) => {
            return prevPromise.then(fn)
        }, Promise.resolve(initial))
    }

export const composeMatrixOperators =
    <T extends number>(...ops: Array<(arg: any) => any>) =>
    (matrix: CSR<T>): Promise<CSR<T>> => {
        return pipe(...(ops as PipeArgs<[...any[], CSR<T> | Promise<CSR<T>>]>))(
            matrix,
        )
    }
