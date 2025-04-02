import {
    Context,
    EventMap,
    EventSystem,
    HookPhase,
    HookRegistration,
    HookSystem,
    Middleware,
} from './pipe.types'
import { Pipe } from './pipe.interface'

export const makeEventSystem = <T extends EventMap>(): EventSystem<T> => {
    const listeners = new Map<keyof T, Set<(...args: any[]) => void>>()

    return {
        on: (event, handler) => {
            if (!listeners.has(event)) listeners.set(event, new Set())
            listeners.get(event)?.add(handler)
        },
        emit: (event, ...args) => {
            listeners.get(event)?.forEach(handler => handler(...args))
        },
    }
}

export const makeHookSystem = <
    TContext extends Record<string, unknown>,
    TEvents extends EventMap,
>(): HookSystem<TContext, TEvents> => {
    const hooks = new Map<HookPhase, HookRegistration<TContext, TEvents>[]>()

    return {
        register: (phase, handler, priority = 0) => {
            const existing = hooks.get(phase) || []
            hooks.set(phase, [...existing, { handler, priority }])
        },
        trigger: async (phase, ctx) => {
            const phaseHooks = (hooks.get(phase) || []).sort(
                (a, b) => (b.priority || 0) - (a.priority || 0),
            )

            for await (const { handler } of phaseHooks) {
                handler(ctx) // todo; await has no effect on the type of this exception
            }
        },
    }
}

export const makeInitialContext = <
    T extends Record<string, unknown>,
    TEvents extends EventMap,
>(
    input: T,
    events: EventSystem<TEvents>,
): Context<T, TEvents> => ({
    ...input,
    $source: input,
    $events: events,
    $hooks: makeHookSystem<T, TEvents>(),
})

export const processMiddleware = async <
    TInput extends Record<string, unknown>,
    TOutput extends Record<string, unknown>,
    TEvents extends EventMap,
>(
    mw: Middleware<TInput, TOutput, TEvents>,
    ctx: Context<TInput, TEvents>,
): Promise<Context<TInput & TOutput, TEvents>> => {
    try {
        if (mw.deps?.length) {
            const missing = mw.deps.filter(d => !(d in ctx))
            if (missing.length) {
                throw new Error(`Missing dependencies: ${missing.join(', ')}`) // todo; exception caught locally
            }
        }
        // ReferenceError: middlewares is not defined at eval
        const result = await mw.process(ctx)

        const providedKeys = Object.keys(result)
        const expectedKeys = Array.isArray(mw.provides)
            ? mw.provides
            : [mw.provides]
        // @ts-ignore todo; catches expected ones as "unexpected" keys
        const unexpectedKeys = providedKeys.filter(
            k => !expectedKeys.includes(k),
        )

        // if (unexpectedKeys.length) {
        //     throw new Error( // todo; exception caught locally
        //         `Middleware ${mw.name} provided unexpected keys: ${unexpectedKeys.join(', ')}`,
        //     )
        // }

        return {
            ...ctx,
            ...result,
            $source: ctx.$source,
            $events: ctx.$events,
            $hooks: ctx.$hooks,
        } as Context<TInput & TOutput, TEvents>
    } catch (error: unknown) {
        if (mw.rollback) {
            const errorContext: Context<TInput & TOutput, TEvents> = {
                ...ctx,
                ...(await mw.process(ctx)),
                $error: error as Error,
                $hooks: makeHookSystem<TInput & TOutput, TEvents>(),
            }
            await mw.rollback(errorContext)
        }
        throw error
    }
}

export type InferInput<TProcess> = TProcess extends (ctx: Context<infer I, any>) => any
    ? I
    : never

export type InferOutput<TProcess> = TProcess extends (
    ctx: Context<any, any>,
) => infer O
    ? O
    : never

export const expandMiddleware = <
    TProcess extends (ctx: any) => any,
    TEvents extends Record<string, (...args: any[]) => void> = {},
>(mw: {
    name: string
    deps?: (keyof InferInput<TProcess> & string)[]
    provides: (keyof InferOutput<TProcess> & string)[]
    process: TProcess
    rollback?: (
        ctx: Context<InferInput<TProcess> & InferOutput<TProcess>, TEvents>,
    ) => void | Promise<void>
}): Middleware<InferInput<TProcess>, InferOutput<TProcess>, TEvents> => {
    return mw as Middleware<
        InferInput<TProcess>,
        InferOutput<TProcess>,
        TEvents
    >
}

export const makePipe = <
    TEvents extends EventMap = {},
    TInitial extends Record<string, unknown> = Record<string, unknown>,
>(): Pipe<TInitial, Record<string, unknown>, TEvents> => {
    const middlewares: Middleware<
        Record<string, unknown>,
        Record<string, unknown>,
        TEvents
    >[] = []
    const eventSystem = makeEventSystem<TEvents>()
    const hookSystem = makeHookSystem<Record<string, unknown>, TEvents>()

    return {
        async execute(input) {
            let ctx = makeInitialContext(input, eventSystem)
            const hookSystem = makeHookSystem<typeof ctx, TEvents>()

            try {
                await hookSystem.trigger('before', ctx)

                for (const mw of middlewares) {
                    await hookSystem.trigger('beforeEach', ctx)
                    // Type assertion for middleware compatibility
                    ctx = await processMiddleware(
                        mw as unknown as Middleware<typeof ctx, any, TEvents>,
                        ctx,
                    )
                    Object.freeze(ctx)

                    await hookSystem.trigger('afterEach', ctx)
                }

                await hookSystem.trigger('after', ctx)
                return ctx as Context<any, TEvents>
            } catch (error) {
                const errorCtx: Context<Record<string, unknown>, TEvents> = {
                    ...ctx,
                    $error: error as Error,
                    $hooks: makeHookSystem<Record<string, unknown>, TEvents>(),
                }

                await hookSystem.trigger(
                    'error',
                    errorCtx as Context<any, TEvents>,
                )
                throw errorCtx
            }
        },

        use<TNew extends Record<string, unknown>>(
            mw: Middleware<Record<string, unknown>, TNew, TEvents>,
        ) {
            middlewares.push(mw as Middleware<any, any, TEvents>)
            return this as unknown as Pipe<
                TInitial, // try to tinker unknown / never
                Record<string, unknown> & TNew,
                TEvents
            >
        },
        on(event, handler) {
            eventSystem.on(event, handler)
            return this
        },

        events: eventSystem,
        hooks: hookSystem,
    }
}
