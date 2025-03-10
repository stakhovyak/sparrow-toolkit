export type Context = Record<string | symbol, any>;

export type ResolvedObject<T extends object> = { [K in keyof T]: Awaited<T[K]> };

export type PipeContext<T = any, Additional extends object = {}> = {
    value: T;
} & Additional;

const resolveObject = async <T extends object>(obj: T): Promise<ResolvedObject<T>> => {
    const entries = await Promise.all(
        Object.entries(obj).map(async ([k, v]) => [k, await v])
    );
    return Object.fromEntries(entries) as ResolvedObject<T>;
};

export const withDeps = <Keys extends string[], R>(...deps: Keys) => {
    return <C extends Context>(
        fn: (...args: { [K in keyof Keys]: C[Keys[K]] }) => R
    ) => {
        return (ctx: C) => {
            const args = deps.map(d => ctx[d]) as { [K in keyof Keys]: C[Keys[K]] };
            return fn(...args);
        };
    };
};

export const pipe = <Fns extends ((ctx: Context) => any)[]>(...fns: Fns) => {
    return async <I>(initial: I): Promise<Context> => {
        let ctx: Context = { value: initial };
        for (const fn of fns) {
            const result = await fn(ctx);
            const merged =
                typeof result === "object" && result !== null
                    ? await resolveObject(result)
                    : { value: result };
            ctx = { ...ctx, ...merged };
        }
        return ctx;
    };
};
