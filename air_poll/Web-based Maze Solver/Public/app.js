document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const solveButton = document.getElementById('solve-button');
    const resetButton = document.getElementById('reset-button');
    const toolSelect = document.getElementById('tool-select');
    const statusText = document.getElementById('status-text');

    const GRID_WIDTH = 20;
    const GRID_HEIGHT = 15;
    let grid = [];
    let startPoint = null;
    let endPoint = null;

    function createGrid() {
        gridContainer.innerHTML = '';
        grid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                gridContainer.appendChild(cell);
            }
        }
    }

    gridContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('cell')) return;

        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const tool = toolSelect.value;
        
        // Clear previous start/end points if setting a new one
        if (tool === 'start') {
            if(startPoint) document.querySelector(`.cell[data-x='${startPoint.x}'][data-y='${startPoint.y}']`).classList.remove('start');
            startPoint = { x, y };
        } else if (tool === 'end') {
            if(endPoint) document.querySelector(`.cell[data-x='${endPoint.x}'][data-y='${endPoint.y}']`).classList.remove('end');
            endPoint = { x, y };
        }

        // Apply tool
        e.target.className = 'cell'; // Reset classes
        if (tool === 'wall') {
            e.target.classList.toggle('wall');
            grid[y][x] = grid[y][x] === 1 ? 0 : 1;
        } else {
            e.target.classList.add(tool);
        }
    });

    solveButton.addEventListener('click', async () => {
        if (!startPoint || !endPoint) {
            alert('Please set a start and end point.');
            return;
        }

        statusText.textContent = 'Solving maze and sending to robot...';

        const response = await fetch('http://localhost:3000/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grid, start: startPoint, end: endPoint })
        });

        if (response.ok) {
            const result = await response.json();
            statusText.textContent = `Path found! Commands: ${result.commands.join(', ')}. Robot is running.`;
            // Visualize path on the grid
            result.path.forEach(p => {
                const cell = document.querySelector(`.cell[data-x='${p.x}'][data-y='${p.y}']`);
                if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                    cell.classList.add('path');
                }
            });
        } else {
            statusText.textContent = 'Error: Could not find a path or connect to the robot.';
        }
    });

    resetButton.addEventListener('click', () => {
        startPoint = null;
        endPoint = null;
        statusText.textContent = 'Draw your maze and set start/end points.';
        createGrid();
    });

    createGrid();
});