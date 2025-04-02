export type Context<
    T extends Record<string, unknown>,
    TEvents extends EventMap = {},
> = T & {
    $source: unknown
    $error?: Error
    $events: EventSystem<TEvents>
    $hooks: HookSystem<T, TEvents>
}

export type Middleware<
    TInput extends Record<string, unknown>,
    TOutput extends Record<string, unknown>,
    TEvents extends EventMap,
> = {
    name: string
    deps?: (keyof TInput & string)[]
    provides: (keyof TOutput & string)[]
    process: (ctx: Context<TInput, TEvents>) => Promise<TOutput> | TOutput // Promise<Context<TOutput, TEvents>> // Context<TOutput, TEvents>
    rollback?: (ctx: Context<TInput & TOutput, TEvents>) => Promise<void> | void
}

export type EventMap = Record<string, (...args: any[]) => void>
export type EventSystem<T extends EventMap = {}> = {
    on: <K extends keyof T>(event: K, handler: T[K]) => void
    emit: <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => void
}

export type HookRegistration<
    TContext extends Record<string, unknown>,
    TEvents extends EventMap,
> = {
    handler: (ctx: Context<TContext, TEvents>) => void
    priority?: number
}
export type HookPhase =
    | 'before'
    | 'beforeEach'
    | 'after'
    | 'afterEach'
    | 'error'
export type HookSystem<
    TContext extends Record<string, unknown>,
    TEvents extends EventMap,
> = {
    register: (
        phase: HookPhase,
        handler: (ctx: Context<TContext, TEvents>) => void,
        priority?: number,
    ) => void
    trigger: (
        phase: HookPhase,
        ctx: Context<TContext, TEvents>,
    ) => Promise<void>
}
