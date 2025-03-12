const createEventSystem = <T extends EventMap>(): EventSystem<T> => {
    const listeners = new Map<keyof T, Set<(...args: T[]) => void>>() // todo; or better leave the ..args of type any[]?

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

const createHookSystem = <TEvents extends EventMap>(): HookSystem<TEvents> => {
    const hooks = new Map<HookPhase, HookRegistration<TEvents>[]>()

    return {
        register: (phase, handler, priority = 0) => {
            const existing = hooks.get(phase) || []
            hooks.set(phase, [...existing, { handler, priority }])
        },
        trigger: async (phase, ctx) => {
            const phaseHooks = (hooks.get(phase) || []).sort(
                (a, b) => (a.priority || 0) - (b.priority || 0),
            )

            // for await (const { handler } of phaseHooks) {
            //     handler(ctx)
            // }

            ;(await Promise.all(phaseHooks))
                .map(hook => hook.handler)
                .map(handler => handler(ctx))
        },
    }
}

const createInitialContext = <T, TEvents extends EventMap>(
    input: T,
    events: EventSystem<TEvents>,
    hooks: HookSystem<TEvents>,
): Context<T, TEvents> => ({
    value: input,
    source: input,
    events,
    hooks,
    [Symbol.toStringTag]: 'PipeContext',
})

const processMiddleware = async <TInput, TOutput, TEvents extends EventMap>(
    mw: MiddleWare<TInput, TOutput, TEvents>,
    ctx: Context<TInput, TEvents>,
): Promise<Context<TOutput, TEvents>> => {
    try {
        if (mw.deps?.length) {
            const missing = mw.deps.filter(d => !(d in ctx))
            if (missing.length)
                throw new Error(`Missing dependencies: ${missing.join(', ')}`)
        }

        const result = await mw.process(ctx)

        if (!result || typeof result !== 'object') {
            throw new Error(`Middleware ${mw.name} returned invalid context`)
        }

        return { ...ctx, ...result, value: result.value /*?? ctx.value*/ }
    } catch (error) {
        if (mw.rollback) await mw.rollback(ctx)
        throw error
    }
}

export const createPipeline = <TEvents extends EventMap>(): Pipeline<
    unknown,
    unknown,
    TEvents
> => {
    const middlewares: MiddleWare<any, any, TEvents>[] = []
    const eventSystem = createEventSystem<TEvents>()
    const hookSystem = createHookSystem<TEvents>()

    return {
        async execute(input) {
            let ctx = createInitialContext<unknown, TEvents>(
                input,
                eventSystem,
                hookSystem,
            )

            try {
                await hookSystem.trigger('before', ctx)

                for (const mw of middlewares) {
                    ctx = await processMiddleware(mw, ctx)
                }

                await hookSystem.trigger('after', ctx)
                return ctx as Context<unknown, TEvents>
            } catch (error) {
                ctx.error = error as Error
                await hookSystem.trigger('error', ctx)
                throw ctx
            }
        },

        use(mw) {
            middlewares.push(mw)
            return this as unknown as Pipeline<any, any, TEvents>
        },

        events: eventSystem,
        hooks: hookSystem,
    }
}
