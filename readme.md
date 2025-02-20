# A TypeScript toolkit for working with large graphs through their Laplacian matrices and spectral properties.

## Why this exists?

Solely, for my creative programming and net art related purposes.

## Design concepts, usage

You can store large combinatorial graph, statistical data in CRS sparse array, on which you can define different
operations. The key concept, the main usage of the library is to be able to map certain graph of choice, (or route)
to the large graph and use custom hooks, associated with different possible graph states and actions, to define
custom operations (e.g. graph flood-fill algorithm) inside of the whole graph being anazyled.

## Example use case

Given a large weighted graph, on which you perform spectral clustering, spectral clustering returns a set of, you won't believe - CLUSTERS. Having some branching and complex route mapped to the graph, you can launch a graph floodfill algorithm, and hook certain functions for events when an edge in the cluster being visited, etc.
