import {
    Context,
    EventMap,
    EventSystem,
    HookSystem,
    Middleware,
} from './pipe.types'

export interface Pipe<
    TInitial extends Record<string, unknown>,
    TCurrent extends Record<string, unknown>,
    TEvents extends EventMap,
> {
    use: <TNew extends Record<string, unknown>>(
        middleware: Middleware<TCurrent, TNew, TEvents>,
    ) => Pipe<TInitial, TCurrent & TNew, TEvents>

    execute: (input: TInitial) => Promise<Context<TCurrent, TEvents>>

    on: <K extends keyof TEvents>(
        event: K,
        handler: TEvents[K]
    ) => Pipe<TInitial, TCurrent, TEvents>

    // deprecated
    events: EventSystem<TEvents>

    hooks: HookSystem<TCurrent, TEvents>
}
