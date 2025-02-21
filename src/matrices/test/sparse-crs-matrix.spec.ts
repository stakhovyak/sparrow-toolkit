
// Dummy data for a 2x2 sparse matrix:
import { CRS } from '../crs-matrix.class'
import { MatrixOperator } from '../matrix.interface'

const values = new Float64Array([1, 2, 3]); // example non-zero values
const colIndices = new Int32Array([0, 1, 0]);  // corresponding column indices
const rowPtr = new Int32Array([0, 2, 3]);      // row pointer array (start of each row)
const rows = 2;
const cols = 2;

const matrix = new CRS<number>(values, colIndices, rowPtr, rows, cols)

const unsubscribe = matrix.subscribe({
    notify(event, m, context) {
        console.log('Subscriber received event: ', event)
        m.get(1, 0)
        // @ts-ignore
        context.propagate({ type: 'shape-change', ... })
    }
});

const addOneOperator: MatrixOperator<number, number> = (source) => {
    return source.map<number>((v: number) => v + 1)
}

try {
    const iterator = matrix.nonZeroEntries();
    for (const cell of iterator()) {
        console.log('non zero entry: ', cell)
    }
} catch (error) {
    console.error('nonZeroEnties() error: ', (error as Error).message)
}

unsubscribe()