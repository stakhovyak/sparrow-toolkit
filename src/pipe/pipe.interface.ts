import { Context, EventMap } from './pipe.types'
import { Pipe } from './pipe'

export interface PipeI<
    TContext extends Record<string, unknown>,
    TEvents extends EventMap,
> {
    use<TNew extends Record<string, unknown>>(
        processors: Record<
            string,
            (ctx: Context<TContext>) => Promise<TNew> | TNew
        >,
    ): PipeI<TContext & TNew, TEvents>

    embed<
        TNewContext extends Record<string, unknown>,
        TNewEvents extends EventMap,
    >(
        ...pipes: Pipe<TNewContext, TNewEvents>[]
    ): Pipe<TContext & TNewContext, TEvents & TNewEvents>

    branch<
        TTrueContext extends Record<string, unknown>,
        TFalseContext extends Record<string, unknown>,
    >(
        predicate: (ctx: Context<TContext>) => boolean,
        truePipe: Pipe<TTrueContext, TEvents>,
        falsePipe: Pipe<TFalseContext, TEvents>,
    ): Pipe<TContext & (TTrueContext | TFalseContext), TEvents>

    on<K extends keyof TEvents>(
        event: K,
        handler: TEvents[K],
    ): PipeI<TContext, TEvents>

    execute(input?: Partial<TContext>): Promise<Context<TContext>>
}
