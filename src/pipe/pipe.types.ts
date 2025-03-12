// type Primitive = string | number | boolean | symbol

type Context<T = unknown, TEvents extends EventMap = {}> = {
    value: T
    source: T
    error?: Error
    events: EventSystem<TEvents>
    hooks: HookSystem<TEvents>
} & { [key: string]: unknown }

type MiddleWare<
    TInput = unknown,
    TOutput = unknown,
    TEvents extends EventMap = {},
> = {
    name: string
    deps?: (keyof Context<unknown, TEvents>)[]
    process: (
        ctx: Context<TInput, TEvents>,
    ) => Promise<Context<TOutput, TEvents>> | Context<TOutput, TEvents>
    rollback?: (ctx: Context<unknown, TEvents>) => Promise<void> | void
}

type EventMap = Record<string, (...args: any[]) => void>
type EventSystem<T extends EventMap = {}> = {
    on: <K extends keyof T>(event: K, handler: T[K]) => void
    emit: <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => void
}

type HookRegistration<TEvents extends EventMap> = {
    handler: (ctx: Context<unknown, TEvents>) => void
    priority?: number
}
type HookPhase = 'before' | 'after' | 'error'
type HookSystem<TEvents extends EventMap> = {
    register: (
        phase: HookPhase,
        handler: (ctx: Context<unknown, TEvents>) => void,
    ) => void
    //    priority?: number
    trigger: (phase: HookPhase, ctx: Context<unknown, TEvents>) => Promise<void>
}
