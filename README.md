# Pathfinding Algorithms

Some Fooling around with pathfinding algorithms, inspired by this [very interesting article](https://www.redblobgames.com/pathfinding/a-star/introduction.html).

I implemented a customizable grid to visualize the process with various terrains.

The repo works as a standalone, so running the html in a browser should be good.
This program uses [jQuery](https://jquery.com), internet connection is **required**.

Algorithms :

- BFS.
- Dijkstra.
- A*.

---

The grid represents a terrain. Obstacles can be added, in a form of a river tile, a forest tile or a solid obstacle.

After setting the start and end tile, the button 'Update Weights' will generate random weights representing the roughness of the terrain.

The algorithm will take that into account when finding the shortest path from start to end.

The path resolution is animated to see the explore tiles as well as path reconstruction.
