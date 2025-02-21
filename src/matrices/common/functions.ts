import { IMatrix, LaplacianMatrix, SymmetricMatrix } from '../matrix.interface'

export function isLaplacian(matrix: IMatrix<any>): matrix is LaplacianMatrix {
    throw new Error('Not implemented')
}

export function isSymmetric(matrix: IMatrix<any>): matrix is SymmetricMatrix {
    throw new Error('Not implemented')
}