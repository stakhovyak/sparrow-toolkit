import {
    pipe,
    withDeps,
} from '../../../src/matrices/operations/csr.pipes'
import { CSR } from '../../../src/matrices/csr.interface'
import { combine, filter, map, reduce } from '../../../src/matrices/operations/csr.operations'
import { nonZeroCellsGet } from '../../../src/matrices/getters/nonzero-cells.get'
import { createCSRFromCells } from '../../../src/matrices/factories/csr.create'
import { MatrixCell } from '../../../src/matrices/matrix.interface'
import { allCellsGet } from '../../../src/matrices/getters/all-cells.get'

// describe('sdf', () => {
//
//     it('is the correct way to use pipe', () => {
//
//         const pipeline = pipe(
//             (_) => ({ count: 10, init: 0 }),
//             withDeps('count', 'init')((count) => ({ total: count * 2 })),
//             (ctx) => ctx.total.toString()
//         )
//
//         const gr = createCSRFromCells(4, 4, [
//             {row: 0, col: 1, val: 1},
//             {row: 0, col: 3, val: 1},
//             {row: 1, col: 0, val: 1},
//             {row: 2, col: 1, val: 1},
//             {row: 2, col: 3, val: 1},
//             {row: 3, col: 1, val: 1},
//         ])
//     })
//
//     it('sh', () => {
//         const doubleThenHalf = pipe(
//             ctx => ctx.value * 2,
//             ctx => ({ half: ctx.value / 2 }), // { value: 10, half: 5 }
//             ctx => ctx.value + ctx['half'], // 15
//         )(5)
//
//         const calc = pipe(
//             ctx => ({ count: ctx.value }),
//             withDeps('count')(count => ({
//                 double: count * 2,
//                 half: count / 2,
//             })),
//             ctx => ctx['double'] + ctx['half'],
//         )
//
//         expect(calc(5).then(v => console.log(v.value)))
//
//         expect(doubleThenHalf.then(value => console.log(value.value)))
//     })
//     it('should compute laplacian', () => {
//         // Step 1: Compute degrees per row.
//         const computeDegrees = async (ctx: PipeContext<CSR<number>>) => {
//             const csr = ctx.value
//             const degrees = await reduce(
//                 nonZeroCellsGet,
//                 (acc, cell) => {
//                     acc[cell.row] = (acc[cell.row] || 0) + cell.val
//                     return acc
//                 },
//                 {} as Record<number, number>,
//             )(csr)
//             return { degrees }
//         }
//
//         // Step 2: Set Laplacian values. Diagonals get the degree; off-diagonals become negative.
//         const setLaplacian = withDeps('degrees')(
//             degrees => async (csr: CSR<number>) => {
//                 return map(nonZeroCellsGet, cell => {
//                     return cell.row === cell.col
//                         ? { ...cell, val: degrees[cell.row] }
//                         : { ...cell, val: -cell.val }
//                 })(csr)
//             },
//         )
//
//         // Compose pipe.
//         const laplacianPipe1 = pipe(computeDegrees, setLaplacian)
//
//         expect(laplacianPipe1(createCSRFromCells(4, 4, [
//             {row: 0, col: 1, val: 1},
//             {row: 0, col: 3, val: 1},
//             {row: 1, col: 0, val: 1},
//             {row: 2, col: 1, val: 1},
//             {row: 2, col: 3, val: 1},
//             {row: 3, col: 1, val: 1},
//         ])).then(v => console.log(v.value.toString())))
//     })

it('is another example of usage', () => {
    const laplacianPipeline = (originalMatrix: CSR<number>) => pipe(
        // Step 1: Add the original matrix to the context.
        (ctx) => ({ ...ctx, originalMatrix }),

        // Step 2: Map operation:
        // Apply a transformation to each non-zero cell—for example, subtract 1
        // from each cell's value to simulate a Laplacian adjustment.
        withDeps('originalMatrix')((originalMatrix: CSR<number>) =>
            map(nonZeroCellsGet, (cell: MatrixCell<number>) => ({
                ...cell,
                val: cell.val - 1, // dummy Laplacian operation
            }))(originalMatrix).then((mappedMatrix) => ({ mappedMatrix })),
        ),

        // Step 3: Filter operation:
        // Remove cells that now have a zero value after the adjustment.
        withDeps('mappedMatrix')((mappedMatrix: CSR<number>) =>
            filter(nonZeroCellsGet, (cell: MatrixCell<number>) => cell.val !== 0)(mappedMatrix).then(
                (filteredMatrix) => ({ filteredMatrix }),
            ),
        ),

        // Step 4: Reduce operation:
        // Compute an aggregate—here the sum of the adjusted (non-zero) cell values.
        withDeps('filteredMatrix')((filteredMatrix: CSR<number>) =>
            reduce(
                nonZeroCellsGet,
                (acc: number, cell: MatrixCell<number>) => acc + cell.val,
                0,
            )(filteredMatrix).then((laplacianSum) => ({ laplacianSum })),
        ),

        // Step 5: Combine operation:
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
    )(originalMatrix)

    expect(
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
    )
})
