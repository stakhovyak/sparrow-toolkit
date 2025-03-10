# NOTE! The lib is still in progress, it isn't complete and is likely to be very buggy

# Functional Typescript toolkit for working with laplacian and spectral graph algebra

## Why?

Solely for my artistic needs, do not use it for serious mathematical researches

## How to work with it?

I tried to make the library design as functional as possible, so the main workflow is 
the compilation of higher-order functions from other higher-order functions into pipelines

Another notable feature of the lib is extensible usage of promises, as they force 
the programmer to use handlers, to prevent function side effects

## How to compose algebraic/matrix operations? 

The main workhorse of the toolkit is the pipe, where the functions are chained with promises
and source all it's operands from something known as 'pipe context'.

### Schematic usage of pipe

```typescript
import { pipe, withDeps } from './csr.pipes'
import { nonZeroCellsGet } from './nonzero-cells.get'

const yourOp = (initArg: number | CSR<number>) => pipe(
    (_) => ({ ...ctx, entryOne: 10, count: 0, initMatr: initArg }), // define the pipe context variables of choise

    // use withDeps macro, to seize the variables from the context of pipe, they will be used in the callback then
    withDeps('initMatr')((originalMatrix: CSR<number>) =>
        // use map function from common operations module, by default, it takes nonZeroCellsGet generator as argument, which will supply the function with cells of target matrix
        map(nonZeroCellsGet, (cell: MatrixCell<number>) => ({
            ...cell,
            val: cell.val - 1,
        }))(originalMatrix).then((mappedMatrix) => ({ mappedMatrix })), // finally, export the variable containing the results in the pipe context to use it in other functions.
    ),
    
    // Remove cells that now have a zero value after the adjustment.
    withDeps('mappedMatrix')((mappedMatrix: CSR<number>) =>
        filter(nonZeroCellsGet, (cell: MatrixCell<number>) => cell.val !== 0)(mappedMatrix).then(
            (filteredMatrix) => ({ filteredMatrix }),
        ),
    ),
    
    // Compute an aggregate—here the sum of the adjusted (non-zero) cell values.
    withDeps('filteredMatrix')((filteredMatrix: CSR<number>) =>
        reduce(
            nonZeroCellsGet,
            (acc: number, cell: MatrixCell<number>) => acc + cell.val,
            0,
        )(filteredMatrix).then((laplacianSum) => ({ laplacianSum })),
    ),
    
    // Combine the original matrix with the filtered (Laplacian) matrix using an element-wise subtraction.
    // This example uses nonZeroCellsGet for the first matrix and allCellsGet for the second.
    withDeps('originalMatrix', 'filteredMatrix')(
        (originalMatrix: CSR<number>, filteredMatrix: CSR<number>) =>
            combine(
                nonZeroCellsGet,
                allCellsGet,
                (a: number, b: number) => a - b)(
                originalMatrix,
                filteredMatrix,
            ).then((combinedMatrix) => ({ combinedMatrix })),
    ),
)(initArg) // supply the initial of the pipe from the wrapper arguments.

// Now, use it.
// See? simple as fuck!
laplacianPipeline(createCSRFromCells(4, 4, [
    { row: 0, col: 1, val: 1 },
    { row: 0, col: 3, val: 1 },
    { row: 1, col: 0, val: 1 },
    { row: 2, col: 1, val: 1 },
    { row: 2, col: 3, val: 1 },
    { row: 3, col: 1, val: 1 },
]))
    .then((result) => {
        // You can now access the context properties with dot notation.
        console.log('Laplacian Sum:', result['laplacianSum'])
        console.log('Combined Matrix:', result['combinedMatrix'])
    })
    .catch((error) => {
        console.error('Pipeline error:', error)
    })

```