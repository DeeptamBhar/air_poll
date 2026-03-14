// Backend Server (server.js)
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files from a 'public' folder

// --- IMPORTANT: UPDATE THIS WITH YOUR ROBOT'S IP ---
const ROBOT_IP = 'http://192.168.1.30'; // Example IP

// --- A* Pathfinding Algorithm Implementation ---
function aStar(grid, start, end) {
    const openSet = [];
    const closedSet = [];
    const path = [];
    
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Create a 2D array for the node details
    const nodes = new Array(rows).fill(null).map(() => new Array(cols).fill(null));

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            nodes[i][j] = {
                x: j, y: i,
                g: 0, h: 0, f: 0,
                isWall: grid[i][j] === 1,
                parent: null
            };
        }
    }

    const startNode = nodes[start.y][start.x];
    const endNode = nodes[end.y][end.x];
    
    openSet.push(startNode);

    while (openSet.length > 0) {
        // Find the node with the lowest f cost
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        let currentNode = openSet[lowestIndex];

        // If we reached the end, reconstruct the path
        if (currentNode === endNode) {
            let temp = currentNode;
            path.push({x: temp.x, y: temp.y});
            while (temp.parent) {
                path.push({x: temp.parent.x, y: temp.parent.y});
                temp = temp.parent;
            }
            return path.reverse();
        }

        // Move current node from open to closed
        openSet.splice(lowestIndex, 1);
        closedSet.push(currentNode);

        const neighbors = getNeighbors(currentNode, nodes);

        for (const neighbor of neighbors) {
            if (closedSet.includes(neighbor) || neighbor.isWall) {
                continue;
            }

            const tempG = currentNode.g + 1;

            if (!openSet.includes(neighbor) || tempG < neighbor.g) {
                neighbor.g = tempG;
                neighbor.h = heuristic(neighbor, endNode);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    // No path found
    return null;
}

function getNeighbors(node, nodes) {
    const neighbors = [];
    const { x, y } = node;
    if (nodes[y - 1] && nodes[y - 1][x]) neighbors.push(nodes[y - 1][x]);
    if (nodes[y + 1] && nodes[y + 1][x]) neighbors.push(nodes[y + 1][x]);
    if (nodes[y] && nodes[y][x - 1]) neighbors.push(nodes[y][x - 1]);
    if (nodes[y] && nodes[y][x + 1]) neighbors.push(nodes[y][x + 1]);
    return neighbors;
}

function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// --- API Endpoint for Solving the Maze ---
app.post('/solve', async (req, res) => {
    const { grid, start, end } = req.body;
    
    // 1. Find the path using A*
    const pathCoords = aStar(grid, start, end);
    if (!pathCoords) {
        return res.status(400).json({ error: 'No path found.' });
    }

    // 2. Convert coordinate path to robot commands (F, L, R)
    const commands = convertPathToCommands(pathCoords);

    // 3. Send commands to the robot
    try {
        await fetch(`${ROBOT_IP}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: commands })
        });
        // 4. Send solved path back to frontend for visualization
        res.json({ path: pathCoords, commands });
    } catch (error) {
        console.error("Error sending commands to robot:", error);
        res.status(500).json({ error: 'Failed to communicate with the robot.' });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// --- Helper function to convert path to robot moves ---
function convertPathToCommands(path) {
    if (path.length < 2) return [];
    
    const commands = [];
    let currentDir = 'E'; // Start facing East (from start to first point)

    // Calculate initial direction
    const dx_init = path[1].x - path[0].x;
    const dy_init = path[1].y - path[0].y;
    if (dx_init === 1) currentDir = 'E';
    else if (dx_init === -1) currentDir = 'W';
    else if (dy_init === 1) currentDir = 'S';
    else if (dy_init === -1) currentDir = 'N';


    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        let nextDir;
        if (dx === 1) nextDir = 'E';
        else if (dx === -1) nextDir = 'W';
        else if (dy === 1) nextDir = 'S';
        else if (dy === -1) nextDir = 'N';

        if (currentDir === nextDir) {
            commands.push('F');
        } else {
            // Determine turn direction
            const directions = ['N', 'E', 'S', 'W'];
            const currentIndex = directions.indexOf(currentDir);
            const nextIndex = directions.indexOf(nextDir);
            
            if ((currentIndex + 1) % 4 === nextIndex) {
                commands.push('R');
            } else {
                commands.push('L');
            }
            commands.push('F'); // Move forward after turning
            currentDir = nextDir;
        }
    }
    return commands;
}