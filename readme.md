# NOTE! The lib is still in progress, it isn't complete and is likely to be very buggy

# Functional Typescript toolkit for working with laplacian and spectral graph algebra

<p align="center">
  <img src="https://github.com/stakhovyak/sparrow-toolkit/blob/98708fecd7d12047c17faae4ec8796dc5471df1d/images/logo.jpg" alt="sparrow logo" width="300" height="300"/>
</p>

## Why "Sparrow"?

Sparrow is a portmanteau name combining three key concepts:
SPArse Matrix + ARROW Syntax + ROW-Based Storage

- **Sparse** - Represents sparse matrix processing - the core focus of the library for efficient handling of matrices with mostly zero values.
- **Arrow** (→) - Dual meaning:
  - Pipe Syntax (|>): Reflects functional programming patterns for chaining operations
  - Graph Edges: Symbolizes directed connections in graph-based computations

The name Sparrow draws deliberate inspiration from avian flocks - natural formations where thousands of birds collectively create ever-shifting graph structures in the sky. 

## Table of contents

<!-- TOC -->
* [Functional Typescript toolkit for working with laplacian and spectral graph algebra](#functional-typescript-toolkit-for-working-with-laplacian-and-spectral-graph-algebra)
  * [Why?](#why)
  * [How to work with it?](#how-to-work-with-it)
  * [How to compose algebraic/matrix operations?](#how-to-compose-algebraicmatrix-operations-)
  * [Pipeline System Tutorial](#pipeline-system-tutorial)
    * [Basic Pipeline Usage](#basic-pipeline-usage)
    * [Key Pipeline Features](#key-pipeline-features)
      * [**Middleware Chaining**:](#middleware-chaining)
      * [**Event Handling**:](#event-handling)
      * [**Hooks System**:](#hooks-system)
      * [**Type Safety**:](#type-safety)
  * [CSR Operations Tutorial](#csr-operations-tutorial)
    * [Core Operations](#core-operations)
    * [Complex Operations Example](#complex-operations-example)
  * [TODO](#todo)
<!-- TOC -->

## Why do this exist?

Solely for my artistic needs, do not use it for serious mathematical researches

## How to work with it?

I tried to make the library design as functional as possible, so the main workflow is 
the compilation of higher-order functions from other higher-order functions into pipelines

Another notable feature of the lib is extensible usage of promises, as they force 
the programmer to use handlers, to prevent function side effects

## How to compose algebraic/matrix operations? 

The main workhorse of the toolkit is the pipe, where the functions are chained with promises
and source all it's operands from something known as 'pipe context'.

## Pipeline System Tutorial

### Basic Pipeline Usage

Create processing pipelines with middleware for complex matrix operations:

```typescript
import { createPipeline, defineMiddleware } from './pipe'
import { createCSRFromCells } from './csr'

// Define event types
interface MatrixEvents {
  log: (message: string) => void
  matrix_created: (matrix: CSR<number>) => void
}

// Create middleware to generate CSR matrix
const matrixCreator = defineMiddleware({
  name: 'matrix-creator',
  provides: 'csr',
  process: () => ({
    csr: createCSRFromCells(3, 3, [
      { row: 0, col: 1, val: 5 },
      { row: 1, col: 2, val: 3 }
    ])
  })
})

// Create transformation middleware
const matrixTransformer = defineMiddleware({
  name: 'matrix-transformer',
  deps: ['csr'],
  provides: 'transformed',
  process: async (ctx) => {
    const transformed = await map(nonZeroCellsGet, cell => ({
      ...cell,
      val: cell.val * 2
    }))(ctx.csr)
    
    ctx.$events.emit('log', 'Matrix transformed')
    return { transformed }
  }
})

// Build and execute pipeline
const pipeline = createPipeline<MatrixEvents>()
  .use(matrixCreator)
  .use(matrixTransformer)

pipeline.events.on('log', console.log)
const result = await pipeline.execute({})
```

### Key Pipeline Features

#### **Middleware Chaining**:
```typescript
pipeline
  .use(createMatrix)
  .use(transformMatrix)
  .use(analyzeMatrix)
```

#### **Event Handling**:
```typescript
pipeline.events.on('matrix_created', matrix => {
  console.log('New matrix:', matrix.values)
})
```
#### **Hooks System**:
```typescript
pipeline.hooks.register('before', ctx => {
  console.log('Starting pipeline with:', ctx)
})

pipeline.hooks.register('afterEach', ctx => {
  console.log('Completed middleware step:', ctx)
})
```

#### **Type Safety**:
```typescript
defineMiddleware<InputType, OutputType>({
  deps: ['required_property'],
  provides: 'new_property',
  // ...
})
```

---

## CSR Operations Tutorial

### Core Operations

1. **Matrix Creation**:
```typescript
// From individual cells
const sparseMatrix = createCSRFromCells(4, 4, [
  { row: 0, col: 1, val: 5 },
  { row: 2, col: 3, val: 3 }
])

// Diagonal matrix
const diagonalMatrix = createCSRFromDiagonal([1, 2, 3, 4])
```

2. **Matrix Transformation**:
```typescript
// Double all values
const doubled = await map(nonZeroCellsGet, cell => ({
  ...cell,
  val: cell.val * 2
}))(originalMatrix)
```

3. **Matrix Filtering**:
```typescript
// Keep values > 2
const filtered = await filter(nonZeroCellsGet, cell => 
  cell.val > 2
)(originalMatrix)
```

4. **Matrix Combination**:
```typescript
// Add two matrices
const sum = await combine(
  nonZeroCellsGet,
  nonZeroCellsGet,
  (a, b) => a + b
)(matrixA, matrixB)
```

5. **Reduction**:
```typescript
// Sum all values
const total = await reduce(
  nonZeroCellsGet,
  (acc, cell) => acc + cell.val,
  0
)(matrix)
```

### Complex Operations Example

```typescript
// Create Laplacian matrix
const adjacency = createCSRFromCells(4, 4, [
  { row: 0, col: 1, val: 1 }, { row: 1, col: 0, val: 1 },
  { row: 1, col: 2, val: 1 }, { row: 2, col: 1, val: 1 },
  { row: 2, col: 3, val: 1 }, { row: 3, col: 2, val: 1 }
])

// Create degree matrix
const degrees = await Promise.all(
  Array.from({ length: adjacency.rowsNumber }, (_, row) =>
    reduce(nonZeroCellsGet, (acc, cell) => 
      acc + (cell.row === row ? 1 : 0), 0
    )(adjacency)
))

const degreeMatrix = createCSRFromDiagonal(degrees)

// Calculate Laplacian
const laplacian = await combine(
  nonZeroCellsGet,
  nonZeroCellsGet,
  (a, b) => a - b
)(degreeMatrix, adjacency)
```

---

## TODO

- [ ] weird reference error bug
- [ ] phantom unexpected dependencies
- [ ] make better type infer for process ctx
- [ ] requires proper testing 
