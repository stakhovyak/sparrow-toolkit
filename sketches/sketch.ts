type SparseMatrixCRS = {
    values: Float64Array
    colIndinces: Int32Array
    rowPtr: Int32Array
}

type LaplacianTag = { readonly __tag: unique symbol }
type SymmetricTag = { readonly __tag: unique symbol }

type SymmetricMatrix<T extends SparseMatrixCRS> = T & SymmetricTag
type LaplacianMatrix<T extends SparseMatrixCRS> = T & LaplacianTag
type AdjacencyMatrix<T extends SparseMatrixCRS> = T & {}

declare function toLaplacian(
    matrix: SymmetricMatrix<SparseMatrixCRS>,
): LaplacianMatrix<SparseMatrixCRS> | never

type GraphState = {
    matrix: LaplacianMatrix<SparseMatrixCRS>
    clusters: Map<string, Cluster>
    processes: Set<GraphProcess>
}

type Cluster = {
    nodes: Set<number>
    hooks: EventHooks
    properties: Map<string, unknown>
    geometry?: {
	centroid: [number, number]
	boundaryNodes: number[]
	spectralRadius: number
    }
}

declare function trackClusterGeometry(
  cluster: Cluster,
  laplacian: LaplacianMatrix<SparseMatrixCRS>
): () => void

type GraphEvent =
    | { type: 'node:visited'; node: number; cluster: string }
    | { type: 'cluster:split'; parent: string; children: [string, string] }
    | { type: 'process:start'; pid: symbol }
    | { type: 'cluster:merge', sources: [string, string] }
    | { type: 'cluster:hierarchy-change' } & {
	_meta?: {
	    timestamp: number
	    source: 'user' | 'process' | 'system'
	}
    }

type EventHandler<T extends GraphEvent> = (
    event: T,
    context: {
        graph: Readonly<GraphState>
        dispatch: (event: GraphEvent) => void
    },
) => Promise<void> | void

type EventHooks = {
    [K in GraphEvent['type']]?: Set<
        EventHandler<Extract<GraphEvent, { type: K }>>
    >
} & { '*': Set<EventHandler<GraphEvent>> } // For global listeners

declare function useGraphHooks(
    hooks: Partial<{
        [K in GraphEvent['type']]: EventHandler<
            Extract<GraphEvent, { type: K }>
        >
    }>,
): (graph: GraphState) => () => void

// TODO: meant generator, investigate how to do them properly
interface GraphProcess {
    prioriry?: number
    *steps(ctx: ProcessContext): Generator<GraphEvent, void, unknown>
    onCancel?: (cleanupFn: () => void) => void
}

type ProcessContext = {
    graph: GraphState
    emit: (event: GraphEvent) => void
    waitFor: (eventtype: GraphEvent['type']) => Promise<GraphEvent>
    fork(process: GraphProcess): () => void
    cancel: AbortSignal
}

type DynamicGraph = {
    matrix: Readonly<SparseMatrixCRS>
    clusters: ReadonlyMap<string, Cluster>
    processes: ReadonlySet<GraphProcess>

    launch(process: GraphProcess): () => void
    observe(handler: (snapshot: GraphState, event: GraphEvent) => void): () => void
    mutateCluster(clusterId: string, fn: (cluster: Cluster) => void): void
}

declare function spectralClustering(
    laplacian: LaplacianMatrix<SparseMatrixCRS>,
    options: {
	k: number
	epsilon?: number
	hook?: (eigenvectors: Float64Array[]) => void
    }
): Map<string, Cluster>

interface TransformContext {
  memo<T>(key: string, factory: () => T): T
  stage: 'pre' | 'post'
  // ... existing
}

type MatrixTransform<Input extends SparseMatrixCRS, Output extends SparseMatrixCRS> = (
    matrix: Input,
    context: {
	onMemoryWarning: (callback: () => void) => void
	cancel?: AbortSignal
    }
) => Output

declare function createPipeline(
    transforms: MatrixTransform<SparseMatrixCRS,SparseMatrixCRS>[],
  opts?: { visualize?: boolean }
): MatrixTransform<SparseMatrixCRS,SparseMatrixCRS>

declare function composeTransforms(...transforms: MatrixTransform<any, any>[]): MatrixTransform<any,any>

// Example usage

const largeCRSMatrix: SparseMatrixCRS
const graph = createDynamicGraph(() => {
    mapTo: largeCRSMatrix
    smth: ":option"
} as DynamicGraphFactoryOptions)
const cleanup = graph.observe((snapshot, event) => {
    if (event.type === 'cluster:split') {
	analyzeClusterStructure(snapshot.clusters.get(event.children[0]));
    }
});

graph.launch({
    *steps({ emit, waitFor }) {
	emit({ type: 'process:start', pid: Symbol() })
	yield { type: 'node:visited', node: 0, cluster: 'root' }
	await waitFor('cluster:ready')
    }
})

// Another example

// Create graph from social network data
const socialGraph = createDynamicGraph(socialNetworkCRS);

// Spectral clustering for community detection
const communities = spectralClustering(socialGraph.matrix, { k: 20 });

// Setup containment protocol hooks
useGraphHooks({
  'node:visited': async ({ node }, { graph, dispatch }) => {
    const cluster = Array.from(graph.clusters.values())
      .find(c => c.nodes.has(node));

    // If >30% infected in cluster, quarantine it
    const infected = cluster.properties.get('infected') as Set<number>;
    if (infected.size / cluster.nodes.size > 0.3) {
      dispatch({
        type: 'cluster:split',
        parent: cluster.id,
        children: [uuid(), uuid()]
      });
    }
  },
  'cluster:split': ({ parent, children }) => {
    // Create containment boundaries
    children.forEach(childId =>
      socialGraph.mutateCluster(childId, c =>
        c.properties.set('quarantined', true)
      )
  }
});

// Epidemic process
socialGraph.launch({
  *steps({ emit }) {
    const patientZero = findCentralNode(socialGraph);

    yield* spreadVirus(patientZero, {
      infectionRate: 0.15,
      emitVisit: (node) => emit({
        type: 'node:visited',
        node,
        cluster: 'initial'
      })
    });
  }
});

async function* spreadVirus(start: number, opts: {
  infectionRate: number
  emitVisit: (n: number) => void
}) {
  const queue = [start];

  while (queue.length) {
    const node = queue.shift()!;
    opts.emitVisit(node);

    const neighbors = getNeighbors(node); // From CRS matrix
    for (const neighbor of neighbors) {
      if (Math.random() < opts.infectionRate) {
        queue.push(neighbor);
        yield { type: 'node:visited', node: neighbor };
      }
    }
  }
}
