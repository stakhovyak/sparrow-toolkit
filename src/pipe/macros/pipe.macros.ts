import { expandMiddleware, InferInput, InferOutput } from '../pipe'
import { Context } from '../pipe.types'

type AutoInferDepsFromProcess<TProcess> =
    InferInput<TProcess> extends Record<string, unknown>
        ? (keyof InferInput<TProcess> & string)[]
        : never[]
type AutoInferProvidesFromProcess<TProcess> =
    InferInput<TProcess> extends Record<string, unknown>
        ? (keyof InferOutput<TProcess> & string)[]
        : never[]

export const expandWith = <
    TProcess extends (ctx: Context<any, TEvents>) => Context<any, TEvents>,
    TEvents extends Record<string, (...args: any[]) => void> = {},
>(
    processFn: TProcess,
) =>
    expandMiddleware<TProcess, TEvents>({
        name: Math.random().toString(),
        deps: ([] as unknown as AutoInferDepsFromProcess<TProcess>),
        provides: ([] as unknown as AutoInferProvidesFromProcess<TProcess>),
        process: processFn,
    })
