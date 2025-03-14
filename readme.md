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

i'll provide it later, check out tests to see how it looks like

## TODO

- [ ] weird reference error bug
- [ ] phantom unexpected dependencies
- [ ] `provides` function doesn't support try catch, should it?
- [ ] requires proper testing 