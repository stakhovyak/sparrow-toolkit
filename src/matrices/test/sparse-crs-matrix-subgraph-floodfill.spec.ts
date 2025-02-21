// Helper: simulate asynchronous delay.
import { IMatrix, MatrixCell } from '../matrix.interface'
import { CRS } from '../crs-matrix.class'

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to get neighboring cells in a grid.
 * For simplicity, we consider the four cardinal directions.
 */
function getNeighbors(
    matrix: IMatrix<number>,
    cell: { row: number; col: number }
): { row: number; col: number }[] {
    const directions = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 }
    ];
    const neighbors: { row: number; col: number }[] = [];
    for (const d of directions) {
        const newRow = cell.row + d.row;
        const newCol = cell.col + d.col;
        if (newRow >= 0 && newRow < matrix.rowsNum && newCol >= 0 && newCol < matrix.colsNum) {
            neighbors.push({ row: newRow, col: newCol });
        }
    }
    return neighbors;
}

/**
 * Asynchronous recursive flood fill algorithm on a subgraph.
 * It visits cells asynchronously (simulated with a delay) and recurses over neighbors.
 */
async function floodFillAsync(
    subGraph: IMatrix<number>,
    cell: { row: number; col: number },
    visited: Set<string>
): Promise<void> {
    const key = `${cell.row}-${cell.col}`;
    if (visited.has(key)) return;
    visited.add(key);

    // Simulate heavy computation per cell.
    await delay(100);
    console.log(`Flood fill visiting subgraph cell (${cell.row}, ${cell.col})`);

    // Process the cell here (e.g., mark it as visited, update its value, etc.)
    // (You can also trigger events here if needed.)

    // Recursively process all neighbors.
    const neighbors = getNeighbors(subGraph, cell);
    for (const neighbor of neighbors) {
        await floodFillAsync(subGraph, neighbor, visited);
    }
}

/**
 * Dummy implementation for triggering a zone-specific callback.
 */
function triggerZoneFunction(change: { row: number; col: number; value: number }): void {
    console.log(`Zone callback triggered for parent cell (${change.row}, ${change.col}) with value ${change.value}`);
}

// -------------------------------------------------------------------
// Example: Embedding a subgraph within a parent graph and starting
// an async flood fill in the subgraph while listening for events
// on the parent graph.
// -------------------------------------------------------------------

// Assume that 'SparseSRCMatrix' implements IMatrix.
// Here we create a dummy parent graph with a 10x10 grid.
const parentGraph = new CRS<number>(
    new Float64Array([/* dummy values */]),
    new Int32Array([/* dummy col indices */]),
    new Int32Array([/* dummy row pointers */]),
    10,  // 10 rows
    10   // 10 columns
);

// Extract a subgraph from the parent.
// For example, let the subgraph be the region covering rows 2-5 and columns 2-5.
const subGraph = parentGraph.submatrix([2, 5], [2, 5]);

// Optional: Embed the subgraph explicitly back into the parent (if your workflow requires it).
parentGraph.embed(subGraph, [2, 2], "merge");

// Set up a subscription on the parent graph.
// When a "data-change" event occurs and a change is within a target zone,
// trigger a designated callback function.
const targetZone = { rowRange: [0, 3], colRange: [0, 3] };

parentGraph.subscribe({
    notify: (event, matrix, context) => {
        if (event.type === "data-change") {
            for (const change of event.changes) {
                // Check if the changed cell falls within the target zone.
                if (
                    change.row >= targetZone.rowRange[0] &&
                    change.row < targetZone.rowRange[1] &&
                    change.col >= targetZone.colRange[0] &&
                    change.col < targetZone.colRange[1]
                ) {
                    console.log(`Parent graph change detected in target zone at cell (${change.row}, ${change.col}).`);
                    triggerZoneFunction(change);
                }
            }
        }
    }
});

// Start the asynchronous flood fill inside the subgraph.
// We'll start from the top-left cell of the subgraph (coordinate (0, 0) in subgraph space).
(async () => {
    const visited = new Set<string>();
    await floodFillAsync(subGraph, { row: 0, col: 0 }, visited);
    console.log("Flood fill complete in subgraph.");
})();

// -------------------------------------------------------------------
// To simulate events in the parent graph, imagine that various operations
// on the parent graph eventually call an internal method that triggers:
// (For demonstration purposes only; in your real implementation these
// triggers would be part of the matrix operation methods.)
const dummyChanges: MatrixCell<number>[] = [
    { row: 1, col: 1, value: 42 },
    { row: 4, col: 4, value: 7 }
];
// (Here, we manually invoke the protected trigger for demonstration.)
(parentGraph as any).triggerDataChange(dummyChanges);
