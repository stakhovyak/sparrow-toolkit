import {
    Context,
    EventMap,
    EventSystem,
    HookSystem,
    MiddleWare,
} from './pipe.types'

export interface Pipeline<
    TInitial extends Record<string, unknown>,
    TCurrent extends Record<string, unknown>,
    TEvents extends EventMap,
> {
    use: <TNew extends Record<string, unknown>>(
        middleware: MiddleWare<TCurrent, TNew, TEvents>,
    ) => Pipeline<TInitial, TCurrent & TNew, TEvents>

    execute: (input: TInitial) => Promise<Context<TCurrent, TEvents>>

    events: EventSystem<TEvents>

    hooks: HookSystem<TCurrent, TEvents>
}
