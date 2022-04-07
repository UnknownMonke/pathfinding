/**
 * Global object containing various pathfinding algorithms.
 * Dissociated (mostly) from any graph implementation for easy reuse.
 */
(function(global) {
    'use strict';

    const pathfinder = {
        endPath: [],
        bfs: bfs,
        dijkstra: dijkstra,
        astar: astar
    };

    // ----------------------------------------------------
    //                       UTILITY
    // ----------------------------------------------------
    // These methods may depends upon graph implementation.

    function visitCell(x, y, visited) {
        return map.validate(x, y) && !visited.has([x,y].toString());
    }

    function equals(c1, c2) {
        return c1[0] === c2[0] && c1[1] === c2[1];
    }

    // Manhattan distance (L1-norm).
    function heuristic(c1, c2) {
        return Math.abs(c2[0] - c1[0]) + Math.abs(c2[1] - c1[1]);
    }

    // Varies upon implementation, here we simply return the neighbor weight.
    function findCost(grid, neighbor) {
        return grid[neighbor[0]][neighbor[1]].weight;
    }

    /**
     * Finds the cell neighbors from the given coordinates that are not an obstacle and have not already been visited,
     * pushes the neighbor into the frontier.
     */
    function findNeighbors(x, y, visited) {
        let neighbors = [];

        if(visitCell(x-1, y, visited)) {
            neighbors.push([x-1, y]);
        }
        if(visitCell(x+1, y, visited)) {
            neighbors.push([x+1, y]);
        }
        if(visitCell(x, y-1, visited)) {
            neighbors.push([x, y-1]);
        }
        if(visitCell(x, y+1, visited)) {
            neighbors.push([x, y+1]);
        }

        // Hack for diagonal pathing in square grid. Avoid 'ugly paths'.
        if( (x + y) % 2 === 0) {
            return neighbors.reverse();
        }
        return neighbors;
    }

    /**
     * Path reconstruction via backtracking.
     * 
     * ---
     * 
     * Reconstructs the path using the visited map:
     * - Each node of the map contains the node from where we came from.
     * - Starting from the exit, we find the node from which we've found the exit,
     * then its previous node, and so on.
     * 
     * @returns the path in reverse order (from finish to start).
     */
    function pathReconstruct(visited, map) {
        let current = map.endCell;

        let endPath = [];

        while(!equals(current, map.startCell)) {
            endPath.push(current);

            // Display. Do not override terrain in order to be able to remove the path.
            if(!equals(current, map.startCell) && !equals(current, map.endCell)) {
                map.toggleCell(current[0], current[1], 'path');
                map.toggleCell(current[0], current[1], 'frontier');
            }
            current = visited.get(current.toString());
        }
        // Appends the starting node to the path.
        endPath.push(map.startCell);

        return endPath;
    }
    
    // ----------------------------------------------------
    //                      ALGORITHMS
    // ----------------------------------------------------

    /**
     * Finds path using a Breadth First Search (BFS) algorithm, with early exit.
     * 
     * We explore each node of the graph, and store the visited nodes in a map, along with the node we came from.
     * 
     * All the direct neighbors of the visited nodes are stored in the frontier.
     * The frontier expands along with the number of visited nodes.
     * 
     * Once we reach the exit, the algorithm stops.
     * 
     * We also wrap the steps in an interval to animate the pathfinding process, instead of a while loop.
     * 
     * Algorithm:
     * - 1 - Find the starting node, add it to the frontier, and mark it as visited with no origin.
     * - 2 - While the frontier is not empty:
     *      - 1 - Pop the first added node from the frontier and make it the current node.
     *      - 2 - If the node is the exit, terminate the loop.
     *      - 3 - Else, if one of the node neighbor is valid (depends upon the graph implementation) and has not been already visited:
     *          - 1 - For every neighbor, push the neighbor into the frontier and mark it as visited with the current node as origin.
     * 
     * ---
     * 
     * NOTE: using the built-in 'frontier.pop()' for step 2.1 will transform the algorithm into Depth-First Search, as the frontier becomes a stack and not a queue (last in first out).
     * 
     * ---
     * 
     * Once the loop terminates, we reconstruct the path using the visited map.
     * 
     * @returns the path from finish to start.
     */
    function bfs(map) {

        let frontier = [];
        let visited = new Map();

        // 1 - Find the starting node, add it to the frontier, and mark it as visited with no origin.
        frontier.push(map.startCell);
        // Map entries are stringified otherwise we can't use get and has methods on objects and I want to keep it simple.
        visited.set(map.startCell.toString(), []);
        
        // 2 - While the frontier is not empty:
        global.currentInterval = setInterval(function() {

            if(frontier.length === 0) { // Exit condition.
                clearInterval(global.currentInterval);

                // Updates the found path.
                pathfinder.endPath = pathReconstruct(visited, map);

                console.info('exit');

            } else {
                // 1 - Pop the first added node from the frontier and make it the current node.
                let currentCell = frontier[0];
                frontier.splice(0,1);

                // Draws the frontier for visualization.
                if(!equals(currentCell, map.startCell) && !equals(currentCell, map.endCell)) {
                    map.toggleCell(currentCell[0], currentCell[1], 'frontier');
                }

                // 2 - If the node is the exit, terminate the loop.
                if(equals(currentCell, map.endCell)) {
                    frontier.splice(0, frontier.length);

                } else {
                    let x = currentCell[0];
                    let y = currentCell[1];

                    // 3 - Else, if one of the node neighbor is valid (depends upon the graph implementation) and has not been already visited:
                    let neighbors = findNeighbors(x, y, visited);

                    for(let i = 0; i < neighbors.length; i++) {
                        // 1 - For every neighbor, push the neighbor into the frontier and mark it as visited with the current node as origin.
                        frontier.push(neighbors[i]);
                        visited.set(neighbors[i].toString(), currentCell);
                    }
                }
            }
        }, 10);
    }

    /**
     * Finds path using Dijkstra's algorithm, with early exit.
     * 
     * We explore each node of the map, store the visited nodes in a map, along with the node we came from.
     * 
     * All the direct neighbors of the visited nodes are stored in the frontier.
     * The frontier expands along with the number of visited nodes.
     * 
     * Once we reach the exit, the algorithm stops.
     * 
     * ---
     * 
     * The difference with BFS is that we take into account the weight of each node (bound to the node rather than links here):
     * 
     * We keep track of the cumulated cost to reach each node, and if a node is visited more than once, 
     * we update its cost and location if its cumulated cost is lower than the previous once stored.
     * 
     * The frontier becomes a priority queue, where the priority of each node is the cumulated cost to reach the node from the start.
     * Each iteration, the lowest priority value is dequeued, which changes the way the frontier expands: more slower in nodes with higher weight.
     * 
     * ---
     * 
     * We also wrap the steps in an interval to animate the pathfinding process, instead of a while loop.
     * 
     * Algorithm:
     * - 1 - Find the starting node, enqueue it to the frontier with zero priority, mark it as visited with no origin, and set the cost to zero.
     * - 2 - While the frontier is not empty:
     *      - 1 - Dequeue the lowest priority node from the frontier and make it the current node.
     *      - 2 - If the node is the exit, terminate the loop.
     *      - 3 - Else, if one of the node neighbor is valid (depends upon the graph implementation) and has not been already visited:
     *          - 1 - For every valid neighbor of the node:
     *              - 1 - Compute the new cumulated cost by adding the cumulated cost of the current node and the cost to reach the neighbor.
     *              - 2 - If the neighbor is not in the cumulated cost array or the newly computed cost is lower than the previously computed cost (node already visited):
     *              - 3 - Enqueue the neighbor to the frontier, update its cumulated cost, and mark it as visited.
     * 
     * Once the loop terminates, we reconstruct the path using the visited map.
     * 
     * @returns the path from finish to start.
     */
    function dijkstra(map) {
        
        let frontier = new PriorityQueue();
        let visited = new Map();
        let cumulatedCost = new Map();

        // 1 - Find the starting node, enqueue it to the frontier with zero priority, mark it as visited with no origin, and set the cost to zero.
        frontier.enqueue(map.startCell, 0);
        visited.set(map.startCell.toString(), []);
        cumulatedCost.set(map.startCell.toString(), 0);
        
        // 2 - While the frontier is not empty:
        global.currentInterval = setInterval(function() {

            if(frontier.isEmpty()) { // Exit condition.
                clearInterval(global.currentInterval);

                // Updates the found path.
                pathfinder.endPath = pathReconstruct(visited, map);

                console.info('exit');

            } else {
                // 1 - Dequeue the lowest priority node from the frontier and make it the current node.
                let currentCell = frontier.dequeue().element;

                // Draws the frontier for visualization.
                if(!equals(currentCell, map.startCell) && !equals(currentCell, map.endCell)) {
                    map.toggleCell(currentCell[0], currentCell[1], 'frontier');
                }

                // 2 - If the node is the exit, terminate the loop.
                if(equals(currentCell, map.endCell)) {
                    frontier = new PriorityQueue();

                } else {
                    let x = currentCell[0];
                    let y = currentCell[1];

                    // 3 - Else, if one of the node neighbor is valid (depends upon the graph implementation) and has not been already visited:
                    let neighbors = findNeighbors(x, y, visited);

                    // 1 - For every valid neighbor of the node:
                    for(let i = 0; i < neighbors.length; i++) {

                        let neighbor = neighbors[i].toString();

                        // 1 - Compute the new cumulated cost by adding the cumulated cost of the current node and the cost to reach the neighbor.
                        let newCost = cumulatedCost.get(currentCell.toString()) + findCost(map.grid, neighbors[i]);

                        // 2 - If the neighbor is not in the cumulated cost array or the newly computed cost is lower than the previously computed cost (node already visited):
                        if(!cumulatedCost.has(neighbor) || newCost < cumulatedCost.get(neighbor)) {

                            // 3 - Enqueue the neighbor to the frontier, update its cumulated cost, and mark it as visited.
                            frontier.enqueue(neighbors[i], newCost);
                            cumulatedCost.set(neighbor, newCost);
                            visited.set(neighbor, currentCell);
                        }
                    }
                }
            }
        }, 10);
    }
    
    /**
     * Finds path using Astar algorithm, with early exit.
     * 
     * Same as Dijkstra's algorithm, but we change the way the priority is calculated:
     * - We try to eliminate nodes that we estimate being too far from the exit by adding an heuristic function to the priority.
     * - The heuristic is chosen according to the graph implementation and changes the behavior of the frontier.
     * - Here, in order to account for how far are we from the exit, we use the 1-norm (manhattan distance) from the neighbor to the exit.
     * - Not adding the cumulated cost produces a Greedy Breadth First Search which may not produce the shortest path when obstacles are included.
     * 
     * This algorithm combines Dijkstra's algorithm and a Greedy Breadth First Search.
     * 
     * Algorithm:
     * - 1 - Find the starting node, enqueue it to the frontier with zero priority, mark it as visited with no origin, and set the cost to zero.
     * - 2 - While the frontier is not empty:
     *      - 1 - Dequeue the lowest priority node from the frontier and make it the current node.
     *      - 2 - If the node is the exit, terminate the loop.
     *      - 3 - Else, if one of the node neighbor is valid (depends upon the graph implementation) and has not been already visited:
     *          - 1 - For every valid neighbor of the node:
     *              - 1 - Compute the new cumulated cost by adding the cumulated cost of the current node and the cost to reach the neighbor.
     *              - 2 - If the neighbor is not in the cumulated cost array or the newly computed cost is lower than the previously computed cost (node already visited):
     *              - 3 - Compute the new priority by adding the heuristic to the new cost, enqueue the neighbor to the frontier with the priority, update its cumulated cost, and mark it as visited.
     * 
     * Once the loop terminates, we reconstruct the path using the visited map.
     * 
     * @returns the path from finish to start.
     */
    function astar(map) {

        let frontier = new PriorityQueue();
        let visited = new Map();
        let cumulatedCost = new Map();

        // 1 - Find the starting node, enqueue it to the frontier with zero priority, mark it as visited with no origin, and set the cost to zero.
        frontier.enqueue(map.startCell, 0);
        visited.set(map.startCell.toString(), []);
        cumulatedCost.set(map.startCell.toString(), 0);
        
        // 2 - While the frontier is not empty:
        global.currentInterval = setInterval(function() {

            if(frontier.isEmpty()) { // Exit condition.
                clearInterval(global.currentInterval);

                // Updates the found path.
                pathfinder.endPath = pathReconstruct(visited, map);

                console.info('exit');

            } else {
                // 1 - Dequeue the lowest priority node from the frontier and make it the current node.
                let currentCell = frontier.dequeue().element;

                // Draws the frontier for visualization.
                if(!equals(currentCell, map.startCell) && !equals(currentCell, map.endCell)) {
                    map.toggleCell(currentCell[0], currentCell[1], 'frontier');
                }

                // 2 - If the node is the exit, terminate the loop.
                if(equals(currentCell, map.endCell)) {
                    frontier = new PriorityQueue();

                } else {
                    let x = currentCell[0];
                    let y = currentCell[1];

                    // 3 - Else, if one of the node neighbor is valid (depends upon the graph implementation) and has not been already visited:
                    let neighbors = findNeighbors(x, y, visited);

                    // 1 - For every valid neighbor of the node:
                    for(let i = 0; i < neighbors.length; i++) {

                        let neighbor = neighbors[i].toString();

                        // 1 - Compute the new cumulated cost by adding the cumulated cost of the current node and the cost to reach the neighbor.
                        let newCost = cumulatedCost.get(currentCell.toString()) + findCost(map.grid, neighbors[i]);

                        // 2 - If the neighbor is not in the cumulated cost array or the newly computed cost is lower than the previously computed cost (node already visited):
                        if(!cumulatedCost.has(neighbor) || newCost < cumulatedCost.get(neighbor)) {

                            // 3 - Compute the new priority by adding the heuristic to the new cost, enqueue the neighbor to the frontier with the priority, update its cumulated cost, and mark it as visited.
                            const priority = newCost + heuristic(map.endCell, neighbors[i]);

                            frontier.enqueue(neighbors[i], priority);
                            cumulatedCost.set(neighbor, newCost);
                            visited.set(neighbor, currentCell);
                        }
                    }
                }
            }
        }, 10);
    }

    // ----------------------------------------------------

    if(typeof module !== 'undefined') {
        module.export = pathfinder;
    } else {
        global.pathfinder = pathfinder;
    }
})(this);