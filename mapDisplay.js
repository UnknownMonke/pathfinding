/**
 * Global object settings to display a customizable grid with different type of terrains for pathfinding algorithms.
 * Single start and exit only, but can support multiple starts and/or exits easily.
 */ 
(function(global) {
    'use strict';

    const map = {
        mapSize: 20,
        startCell: [],
        endCell: [],
        selectedTerrain: '',
        grid: [], // Graph data structure.
        toggleCell: toggleCell,
        validate: validate
    };

    // ----------------------------------------------------
    //                       UTILITY
    // ----------------------------------------------------

    function isStartSet() {
        return map.startCell.length > 0;
    }

    function isEndSet() {
        return map.endCell.length > 0;
    }

    // Checks if given coordinates are in the map.
    function isBound(x, y) {
        return x >= 0 && y >= 0 && x < map.mapSize && y < map.mapSize;
    }

    // Checks if given coordinates are in the map and the cell is not an obstacle.
    function validate(x, y) {
        return isBound(x, y) && map.grid[x][y].type !== 'obstacle';
    }

    // Returns a random float between min and max - 1.
    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Toggles an additional cell type.
    function toggleCell(x, y, cellType) {
        $(`[id="[${x},${y}]"]`).toggleClass(cellType);
    }

    function setTerrain(x, y, terrain) {
        $(`[id="[${x},${y}]"]`)[0].className = 'cell ' + terrain;
        map.grid[x][y].type = terrain;
    }

    function setWeight(x, y, weight) {
        $(`[id="[${x},${y}]"] .weight`).html(weight);
        map.grid[x][y].weight = weight;
    }

    /**
     * Resets the game state (start, end, selected terrain...) and draws the default grid with default terrain (plain) and default weight (1).  
     */ 
    function resetGrid() {
        // --------- Resets ---------
        clearInterval(global.currentInterval);

        map.startCell = [];
        map.endCell = [];

        $('#grid-container').html('');

        // Default terrain is plain.
        $('#terrainSelect').prop('selectedIndex', 2);
        $('#thumbnail').children()[0].className = 'plain';
        map.selectedTerrain = 'plain';

        // --------------------------

        for(let i = 0; i < map.mapSize; i++) {
            for(let j = 0; j < map.mapSize; j++) {

                $('#grid-container').append(
                    `<div id='[${i},${j}]' class='cell plain' data-x='${i}' data-y='${j}'>
                        <span class='weight'>1</span>
                    </div>`
                );
                // Appends to map.
                if(typeof map.grid[i] === 'undefined') {
                    map.grid[i] = new Array(map.mapSize);
                }
                map.grid[i][j] = { type: 'plain', weight: 1 };
            }
        }
        // Binds click event to newly created cells.
        $('div.cell').click(function() {
            clickCell(this);
        });
    }

    // Resets only the pathfinding elements, and keep the map with the terrain set.
    function resetPath() {
        clearInterval(global.currentInterval);

        $('.cell').each( (index, cell) => {
            $(cell).removeClass('frontier').removeClass('path');
        });
    }

    function toggleWeights() {
        $('.cell .weight').each( (index, el) => {
            $(el).toggleClass('hidden');
        });
    }

    // Sets terrain by clicking on the cell, resets the start or exit if they are deleted.
    function clickCell(cell) {
        try {
            let x = parseInt($(cell).attr('data-x'));
            let y = parseInt($(cell).attr('data-y'));

            if(map.selectedTerrain === 'start') {
                if(isStartSet()) {
                    throw 'Error: start already set';
                } else {
                    map.startCell = [x, y];
                }
            }
            if(map.selectedTerrain === 'end') {
                if(isEndSet()) {
                    throw 'Error: exit already set';
                } else {
                    map.endCell = [x, y];
                }
            }

            if(cell.className.includes('start')) {
                map.startCell = [];
            }
            if(cell.className.includes('end')) {
                map.endCell = [];
            }
            setTerrain(x, y, map.selectedTerrain);

        } catch(e) {
            console.error(e);
        }
    }

    /**
     * Dynamically sets the weights for each cell according to its terrain type.
     * 
     * ---
     * 
     * The weight is a number assigned to each terrain type, that reflects the difficulty to pass through it.
     * It can be seen as the time to pass through specific terrain rather than the distance.
     * 
     * The behavior of the algorithms may change when the weight ratio between terrains changes.
     * 
     * We also set an interval for some terrain to add some randomness for visualization.
     * 
     * A start and end must be set to generate the weights.
     */
    function setWeights() {
        try {
            if(!isStartSet()) {
                throw 'Error: start not set';
            }
            if(!isEndSet()) {
                throw 'Error: exit not set';
            }

            for(let i = 0; i < map.mapSize; i++) {
                for(let j = 0; j < map.mapSize; j++) {

                    const type = map.grid[i][j].type;
                    let weight;

                    switch(type) {
                        case 'start':
                            weight = 0;
                            break;
                        case 'end':
                            weight = 0;
                            break;
                        case 'plain':
                            weight = 1;
                            break;
                        case 'forest':
                            weight = Math.round(map.mapSize * random(0.5, 0.7));
                            break;
                        case 'river':
                            weight = Math.round(map.mapSize * random(1.0, 1.2));
                            break;
                        case 'obstacle':
                            weight = -1;
                            break;
                        default:
                            weight = -1;
                            break;
                    }
                    setWeight(i, j, weight);
                }
            }

        } catch(e) {
            console.error(e);
        }
    }

    // ----------------------------------------------------
    //                       EVENTS
    // ----------------------------------------------------
    
    // Init grid on page load.
    resetGrid();

    // Updates terrain selection.
    $('#terrainSelect').change(function() {

        const value = $(this).find(':selected').val();
        // Updates thumbnail.
        $('#thumbnail').children()[0].className = value;

        map.selectedTerrain = value;
    });

    /** 
     * Sets terrain continuously by dragging the mouse.
     * Takes into account leaving the area with or without the mouse still down.
     */
    $('#grid-container').mousedown(function() {

        $(this).unbind('mousemove');

        $(this).mousemove(function() {
            let cellBeneath = $($(':hover')).closest('div.cell')[0];

            // Resets start and exit if we move over.
            if(cellBeneath.className.includes('start')) {
                map.startCell = [];
            }
            if(cellBeneath.className.includes('end')) {
                map.endCell = [];
            }

            if(map.selectedTerrain !== 'start' && map.selectedTerrain !== 'end') {

                let x = parseInt($(cellBeneath).attr('data-x'));
                let y = parseInt($(cellBeneath).attr('data-y'));

                setTerrain(x, y, map.selectedTerrain);
            }
        });
        
    }).mouseup(function() { 
        $('#grid-container').unbind('mousemove');

    }).mouseleave(function() { 
        $('#grid-container').unbind('mousemove'); 
    });

    // --------- Buttons ---------

    $('#gridResetButton').click(function() {
        resetGrid();
    });

    $('#pathResetButton').click(function() {
        resetPath();
    });

    $('#weightButton').click(function() {
        setWeights();
    });

    $('#weightToggle').click(function() {
        toggleWeights();
    });

    $('#bfs').click(function() {
        try {
            if(!isStartSet()) {
                throw 'Error: start not set';
            }
            if(!isEndSet()) {
                throw 'Error: exit not set';
            }
            pathfinder.bfs(map);

        } catch(e) {
            console.error(e);
        }
    });

    $('#dijkstra').click(function() {
        try {
            if(!isStartSet()) {
                throw 'Error: start not set';
            }
            if(!isEndSet()) {
                throw 'Error: exit not set';
            }
            pathfinder.dijkstra(map);

        } catch(e) {
            console.error(e);
        }
    });

    $('#astar').click(function() {
        try {
            if(!isStartSet()) {
                throw 'Error: start not set';
            }
            if(!isEndSet()) {
                throw 'Error: exit not set';
            }
            pathfinder.astar(map);

        } catch(e) {
            console.error(e);
        }
    });

    // ----------------------------------------------------

    if(typeof module !== 'undefined') {
        module.export = map;
    } else {
        global.map = map;
    }
})(this);