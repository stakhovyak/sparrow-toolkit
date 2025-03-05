# NOTE! The lib is still in progress, it isn't complete and is likely to be very buggy

# Functional Typescript toolkit for working with laplacian and spectral graph algebra

## Why?

Solely for my artistic needs, do not use it for serious mathematical researches

## How to work with it?

I tried to make the library design as functional as possible, so the main workflow is 
the compilation of higher-order functions from other higher-order functions into pipelines

Another notable feature of the lib is extensible usage of promises, as they force 
the programmer to use handlers, to prevent function side effects

### Composing operators example 

For example, to compose matrix operator you can use pipe macro `composeMatrixOperators`
Which usage basically looks like this:

```ts
composeMatrixOperators(
  (A) => B, // Step 1: Transform A → B
  (B) => C  // Step 2: Transform B → C
);
```

### How variables pass between steps in pipes?

The pipe function chains operations using .then(), passing the resolved 
value of each step to the next:

```ts
Promise.resolve(initialValue)
  .then(step1) // Output of step1 → input of step2
  .then(step2);
```

### Example: `computeDegreeMatrix`

```ts
const computeDegreeMatrix = composeMatrixOperators(
  // Step 1: CSR<number> -> number[] (degrees)
  (adjacency: CSR<number>) => reduce(...)(adjacency),
  
  // Step 2: number[] -> CSR<number> (diagonal matrix)
  (degrees: number[]) => createCSRFromDiagonal(degrees)
);

// Execution flow:
// adjacency -> degrees array -> diagonal CSR matrix
```

### How results are extracted?

The final result is a `Promise` resolved after all steps complete:

```ts
const resultPromise = computeDegreeMatrix(adjacencyMatrix);
resultPromise.then(finalCSR => {
  console.log(finalCSR);
});
```

### Example: `computeLaplacian`

Use a closure or object to carry both A and intermediate results:

```ts
const computeLaplacian = composeMatrixOperators(
  // Step 1: Return both A and D for later use
  (A: CSR<number>) => ({
    A,
    D: computeDegreeMatrix(A) // returns Promise<CSR<number>>
  }),
  // Step 2: Use D and A from the object
  ({ D, A }) => subtractCSR(await D, A)
);

const laplacian = await computeLaplacian(adjacencyMatrix)
```
