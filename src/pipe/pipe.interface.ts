interface Pipeline<
    TInput = unknown,
    TOutput = TInput,
    TEvents extends EventMap = {},
> {
    use: <TNewOutput>(
        middleware: MiddleWare<TOutput, TNewOutput, TEvents>,
    ) => Pipeline<TInput, TNewOutput, TEvents>

    execute: (input: TInput) => Promise<Context<TOutput, TEvents>>

    events: EventSystem<TEvents>

    hooks: HookSystem<TEvents>
}
