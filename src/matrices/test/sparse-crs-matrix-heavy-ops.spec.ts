// Assume these helper functions are available:

import { IMatrix, MatrixCell } from '../matrix.interface'
import { CRS } from '../crs-matrix.class'

/**
 * Simulate a delay (as a stand-in for heavy computation).
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * An example async heavy algorithm that processes a subgraph.
 * Here, it calculates the sum of all non-zero entries.
 */
async function performHeavyAlgorithm(
    subGraph: IMatrix<number>
): Promise<number> {
    // Simulate a heavy, asynchronous computation.
    await delay(2000);

    let sum = 0;
    // Assume nonZeroEntries() returns an iterable over MatrixCell<number>
    for (const cell of subGraph.nonZeroEntries()()) {
        sum += cell.value;
    }
    return sum;
}

// ----- Creating the Big Graph & Subgraph -----

// Create a big graph (a SparseSRCMatrix instance)
// For simplicity, we provide dummy CRS arrays.
const bigValues = new Float64Array([1, 2, 3, 4, 5]);
const bigColIndices = new Int32Array([0, 2, 1, 3, 4]);
const bigRowPtr = new Int32Array([0, 2, 3, 5]); // e.g., 3 rows
const bigRows = 3;
const bigCols = 5;

const bigGraph = new CRS<number>(
    bigValues,
    bigColIndices,
    bigRowPtr,
    bigRows,
    bigCols
);

// Create an embedded subgraph view from the big graph.
// Assume the submatrix method returns an object that implements IMatrix and EmbeddedMatrix.
const subGraph = bigGraph.submatrix([1, 3], [1, 4]);

// Embed the subgraph explicitly into the big graph at a new location,
// for example to update part of the graph based on some local computation.
// (In our stub, embed is not implemented, but we show its intended usage.)
bigGraph.embed(subGraph, [0, 0], "merge");

// ----- Subscribing to Parent Graph Changes -----

// Subscribe to changes on the big graph.
// When a "data-change" event occurs, trigger the heavy algorithm on the subgraph.
bigGraph.subscribe({
    notify: (event, matrix, context) => {
        if (event.type === "data-change") {
            console.log("Big graph data-change detected. Launching heavy computation on subgraph.");
            // Launch the heavy computation asynchronously.
            performHeavyAlgorithm(subGraph)
                .then(result => {
                    console.log("Heavy algorithm on subgraph completed. Computed sum:", result);
                    // Optionally, you might propagate the result or update the bigGraph here.
                })
                .catch(err => console.error("Error during heavy computation:", err));
        }
    }
});

// ----- Simulating a Change in the Big Graph -----

// In your real implementation, one of the matrix operations would call triggerDataChange()
// For this example, we simulate it manually.
const dummyChanges: MatrixCell<number>[] = [
    { row: 0, col: 1, value: 42 },
    { row: 2, col: 3, value: 7 },
];

// We assume triggerDataChange is protected, so for our example, we simulate a change by
// calling a public method that eventually triggers it.
// (For demonstration only; in your final code, the update logic would call triggerDataChange.)
(bigGraph as any).triggerDataChange(dummyChanges);
