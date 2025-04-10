import {
    EventMap,
    Context,
    EventSystem,
    // HookSystem,
    // HookPhase,
    BaseContext,
} from './pipe.types'
import { PipeI } from './pipe.interface'

export class Pipe<
    TContext extends Record<string, unknown>,
    TEvents extends EventMap,
> implements PipeI<TContext, TEvents>
{
    private processors: Array<
        Record<string, (ctx: Context<TContext>) => Promise<any> | any>
    > = []
    public readonly events: EventSystem<TEvents>
    // public readonly hooks: HookSystem<Context<TContext>>

    constructor() {
        this.events = this.createEventSystem()
        // this.hooks = this.createHookSystem()
    }

    static make<TEvents extends EventMap = {}>(): Pipe<BaseContext, TEvents> {
        return new Pipe<BaseContext, TEvents>()
    }

    use<TNew extends Record<string, unknown>>(
        processors: Record<
            string,
            (ctx: Context<TContext>) => Promise<TNew> | TNew
        >,
    ): Pipe<TContext & TNew, TEvents> {
        this.processors.push(processors)
        return this as unknown as Pipe<TContext & TNew, TEvents>
    }

    on<K extends keyof TEvents>(
        event: K,
        handler: TEvents[K],
    ): PipeI<TContext, TEvents> {
        this.events.on(event, handler)
        return this
    }

    embed<
        TNewContext extends Record<string, unknown>,
        TNewEvents extends EventMap,
    >(
        pipe: Pipe<TNewContext, TNewEvents>,
    ): Pipe<TContext & TNewContext, TEvents & TNewEvents> {
        this.processors.push(...pipe.processors as unknown as Array<Record<string, (ctx: Context<TContext>) => any>>) // todo; <html>TS2345: Argument of type 'Record&lt;string, (ctx: Context&lt;TNewContext&gt;) =&gt; any&gt;' is not assignable to parameter of type 'Record&lt;string, (ctx: Context&lt;TContext&gt;) =&gt; any&gt;'.<br/>'string' index signatures are incompatible.<br/>Type '(ctx: Context&lt;TNewContext&gt;) =&gt; any' is not assignable to type '(ctx: Context&lt;TContext&gt;) =&gt; any'.<br/>Types of parameters 'ctx' and 'ctx' are incompatible.<br/>Type 'Context&lt;TContext&gt;' is not assignable to type 'Context&lt;TNewContext&gt;'.<br/>Type 'Context&lt;TContext&gt;' is not assignable to type 'TNewContext'.<br/>'Context&lt;TContext&gt;' is assignable to the constraint of type 'TNewContext', but 'TNewContext' could be instantiated with a different subtype of constraint 'Record&lt;string, unknown&gt;'.

        const sourceListeners = (pipe.events as any).listeners as Map<
            keyof TNewEvents,
            Set<any>
        >

        const destListeners = (this.events as any).listeners as Map<
            keyof TEvents,
            Set<any>
        >

        sourceListeners.forEach((handlers, event) => {
            const typedEvent = event as keyof (TEvents | TNewEvents) // todo; TEvents & TNewEvents ??
            if (!destListeners.has(typedEvent)) {
                destListeners.set(typedEvent, new Set())
            }
            handlers.forEach(handler =>
                destListeners.get(typedEvent)?.add(handler),
            )
        })

        return this as unknown as Pipe<
            TContext & TNewContext,
            TEvents & TNewEvents
        >
    }

    branch<
        TTrueContext extends Record<string, unknown>,
        TFalseContext extends Record<string, unknown>,
    >(
        predicate: (ctx: Context<TContext>) => boolean,
        truePipe: Pipe<TTrueContext, TEvents>,
        falsePipe: Pipe<TFalseContext, TEvents>,
    ): Pipe<TContext & (TTrueContext | TFalseContext), TEvents> {
        const branchProcessor = async (ctx: Context<TContext>) => {
            try {
                const result = predicate(ctx)

                const chosenPipe = result ? truePipe : falsePipe

                let currentCtx = ctx
                for (const processorGroup of chosenPipe.processors) {
                    const results = await Promise.all(
                        Object.values(processorGroup).map(processor =>
                            processor(currentCtx),
                        ),
                    )
                    currentCtx = Object.assign({}, currentCtx, ...results)
                    Object.freeze(currentCtx)
                }

                return currentCtx
            } catch (error) {
                throw error
            }
        }

        this.processors.push({ branch: branchProcessor })
        return this as unknown as Pipe<
            TContext & (TTrueContext | TFalseContext),
            TEvents
        >
    }

    async execute(input: Partial<TContext> = {}): Promise<Context<TContext>> {
        let ctx = this.createInitialContext(input)

        try {
            // await this.hooks.trigger('before', ctx)
            for (const processorGroup of this.processors) {
                const results = await Promise.all(
                    Object.values(processorGroup).map(processor =>
                        processor(ctx),
                    ),
                )
                ctx = Object.assign({}, ctx, ...results)
                Object.freeze(ctx)
            }
            // await this.hooks.trigger('after', ctx)
            return ctx
        } catch (error) {
            let errorContext: TContext & BaseContext
            errorContext = this.createErrorContext(ctx, error)
            // await this.hooks.trigger('error', errorContext)
            throw errorContext
        }
    }

    private createEventSystem(): EventSystem<TEvents> {
        const listeners = new Map<
            keyof TEvents,
            Set<(...args: any[]) => void>
        >()

        return {
            on: (event, handler) => {
                if (!listeners.has(event)) listeners.set(event, new Set())
                listeners.get(event)?.add(handler)
                return this.events
            },
            emit: (event, ...args) => {
                listeners.get(event)?.forEach(handler => handler(...args))
            },
        }
    }

    // private createHookSystem(): HookSystem<Context<TContext>> {
    //     const hooks = new Map<
    //         HookPhase,
    //         Array<{
    //             handler: (ctx: Context<TContext>) => void
    //             priority: number
    //         }>
    //     >()
    //
    //     return {
    //         register: (phase, handler, priority = 0) => {
    //             const phaseHooks = hooks.get(phase) || []
    //             phaseHooks.push({ handler, priority })
    //             hooks.set(
    //                 phase,
    //                 phaseHooks.sort((a, b) => b.priority - a.priority),
    //             )
    //         },
    //         trigger: async (phase, ctx) => {
    //             for await (const { handler } of hooks.get(phase) || []) {
    //                 handler(ctx)
    //             }
    //         },
    //     }
    // }

    private createInitialContext(input: Partial<TContext>): Context<TContext> {
        return {
            ...input,
            source: input,
            events: this.events,
            // hooks: this.hooks,
        } as unknown as Context<TContext>
    }

    private createErrorContext(
        ctx: Context<TContext>,
        error: unknown,
    ): Context<TContext> {
        return {
            ...ctx,
            error: error instanceof Error ? error : new Error(String(error)),
        }
    }
}
