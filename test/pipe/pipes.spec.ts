import { EventMap } from '../../src/pipe/pipe.types'
import { createPipeline, defineMiddleware } from '../../src/pipe/pipe.create'

/**
 * A simple event map for testing.
 */
interface TestEvents extends EventMap {
    log: (msg: string) => void
}

describe('Pipeline Integration Tests', () => {
    it('should chain middleware and merge context values', async () => {
        // Assuming TestEvents is defined somewhere.
        const mw1 = defineMiddleware({
            name: 'addX',
            deps: ['a'],
            provides: 'x',
            process: ctx => ({ ...ctx, x: ctx.a + 10 }),
        })

        // For a middleware that depends on a property from a previous middleware:
        const mw2 = defineMiddleware({
            name: 'addY',
            deps: ['x'],
            provides: 'y',
            process: ctx => ({ y: ctx.x * 2 }),
        })

        const pipeline = createPipeline<TestEvents>()

        // Use both middlewares in the pipeline.
        pipeline.use(mw1).use(mw2)

        // Execute the pipeline.
        const input = { a: 5 }
        const result = await pipeline.execute(input)

        // Check that the original input remains intact
        expect(result['a']).toBe(5)
        // Check middleware results
        expect(result['x']).toBe(15)
        expect(result['y']).toBe(30)
    })

    it('should chain middleware and merge context values (more complex)', async () => {
        const pipelineResult = await createPipeline<TestEvents>()
            .use(
                defineMiddleware({
                    name: '1',
                    deps: ['initial', 'a'],
                    provides: 'y',
                    process: ctx => ({ y: ctx.initial * ctx.a }),
                }),
            )
            .use(
                defineMiddleware({
                    name: '2',
                    provides: 'sup',
                    process: _ => ({ sup: 10 }),
                }),
            )
            .use(
                defineMiddleware({
                    name: '3',
                    deps: ['sup', 'initial', 'y'],
                    provides: 'final',
                    process: ctx => ({
                        ...ctx,
                        final: ctx.initial * ctx.y + ctx.sup,
                    }),
                }),
            )
            .execute({ initial: 2, a: 15 })

        expect(pipelineResult.initial).toEqual(2)
        expect(pipelineResult.a).toEqual(15)
        expect(pipelineResult.sup).toEqual(10)
        expect(pipelineResult.y).toEqual(30)
        expect(pipelineResult.final).toEqual(70)
    })
    it('should sdfdf', async () => {
        const greetName = (name: string) =>
            defineMiddleware({
                name: 'greetName',
                deps: ['init'],
                provides: 'greetedString',
                process: ctx => ({ greetedString: `${ctx.init}! ${name}` }),
            })

        const res = await createPipeline()
            .use(greetName('Ivan'))
            .use({
                name: 'in upper case',
                deps: ['greetedString'],
                provides: 'final',
                process: ctx => ({
                    final: ctx.greetedString.toUpperCase(),
                }),
            })
            // .hooks.register('afterEach', ctx => {console.log(ctx.toString().split(', ')[0])})
            // .events.on(...)
            .execute({ init: 'Hello' })

        expect(res.final).toEqual('HELLO! IVAN')
    })
    it('should demonstrate hooks and events', async () => {
        // Create pipeline with logging event type
        interface TestEvents extends EventMap {
            log: (message: string) => void
        }

        // Create middleware that emits events
        const loggingMiddleware = defineMiddleware({
            name: 'logger',
            provides: '_startedAt',
            process: ctx => {
                ctx.$events.emit(
                    'log',
                    `Processing started at ${new Date().toISOString()}`,
                )
                return { _startedAt: new Date().toISOString() }
            },
        })

        // Create the pipeline
        const pipeline = createPipeline<TestEvents>()
            .use(loggingMiddleware)
            .use(
                defineMiddleware({
                    name: 'greeter',
                    provides: 'greeting',
                    process: _ => ({ greeting: 'Hello World' }),
                }),
            )

        // Register hooks
        pipeline.hooks.register('before', ctx => {
            console.log('Pipeline starting with:', ctx)
        })

        pipeline.hooks.register('afterEach', ctx => {
            console.log('Completed middleware:', ctx)
        })

        pipeline.hooks.register('error', ctx => {
            console.error('Pipeline error:', ctx.$error)
        })

        // Listen to events
        pipeline.events.on('log', message => {
            console.log('[LOG]', message)
        })

        // Middleware with event emission
        const auditMiddleware = defineMiddleware({
            name: 'audit',
            provides: 'audit',
            process: async ctx => {
                // try {
                ctx.$events.emit('audit.start', { timestamp: new Date() })
                // Processing logic...
                ctx.$events.emit('audit.success', { duration: 100 })
                return { audit: 'completed' }
                // } catch (error) {
                //     ctx.$events.emit('audit.failure', { error })
                //     throw error
                // }
            },
        })

        // Listening to custom events
        pipeline.events.on('audit.start', ({ timestamp }) => {
            console.log(`Audit started at ${timestamp}`)
        })

        pipeline.events.on('audit.success', ({ duration }) => {
            console.log(`Audit completed in ${duration}ms`)
        })

        // Execute with logging
        const result = await pipeline.execute({})
        console.log('Final result:', result)
    })
    it('should demonstrate usage of events in middleware', () => {})
})
