export type EventMap = Record<string, (...args: any[]) => void>

export interface BaseContext {
    source: unknown
    error?: Error
    events: EventSystem
    // hooks: HookSystem
    [key: string]: unknown
}

export type Context<T extends Record<string, unknown>> = T & BaseContext

export interface Middleware<
    TInput extends BaseContext,
    TOutput extends Record<string, unknown>,
> {
    name: string
    deps?: (keyof TInput)[]
    provides: (keyof TOutput)[]
    process: (ctx: TInput) => Promise<TOutput> | TOutput
    rollback?: (ctx: TInput & TOutput) => Promise<void> | void
}

export interface EventSystem<T extends EventMap = EventMap> {
    on<K extends keyof T>(event: K, handler: T[K]): EventSystem<T>
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void
}

// export type HookPhase = 'before' | 'after' | 'error'
// export interface HookSystem<T extends BaseContext = BaseContext> {
//     register(
//         phase: HookPhase,
//         handler: (ctx: T) => void,
//         priority?: number,
//     ): void
//     trigger(phase: HookPhase, ctx: T): Promise<void>
// }
