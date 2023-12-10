let socket

function initGame() {
    connectWebsocket()
    document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event) {
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        socket.send(JSON.stringify({ key: event.key }));
    }
}

function connectWebsocket() {
    const protocol = window.location.protocol.includes('https') ? 'wss' : 'ws'
    socket = new WebSocket(`${protocol}://oyster-app-oibaq.ondigitalocean.app/`);
    //socket = new WebSocket(`${protocol}://localhost:8080/`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Handle game over
        if (data.type === 'gameOver') {
            document.removeEventListener('keydown', handleKeyDown)
            document.getElementById('statusMessage').textContent = 'Game Over!';
        } 

        // Check if it's the initial color assignment message
        if (data.type === 'init') {
            // Update the status message based on the assigned color
            if (data.color === 'red') {
                statusMessage.textContent = "You are red. Run away from the others!";
            } else {
                statusMessage.textContent = `You are ${data.color}. Catch red!`;
            }
        }

        
        // Only render the grid if it's included in the message
        if (data.grid) {
            renderGrid(data.grid);
        }
        if (data.type === 'restart') {
            document.addEventListener('keydown', handleKeyDown)
        }
    };
}



function renderGrid(grid) {
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = ''; // Clear existing grid

    grid.forEach((row, y) => {
        row.forEach((cell, x) => {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell', cell);
            // cellDiv.classList.add(grid[y][x])
            gridContainer.appendChild(cellDiv);
        });
    });
}

function onClickRestart() {
    if (socket) {
        socket.send(JSON.stringify({ key: 'restart' }))
    }
}
