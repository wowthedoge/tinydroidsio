'use strict';

const express = require('express')
const path = require('path')
const { createServer } = require('http')

const WebSocket = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, '/public')));

const server = createServer(app);
const wss = new WebSocket.Server({ server });

let clientCount = 0
let grid
const gridWidth = 40;
const gridHeight = 20;
const clients = new Map();

wss.on('connection', socket => {
  clientCount += 1
  console.log(`Client ${clientCount} connected`);
  let { x, y, color } = initializeClient(clientCount)
  const clientInfo = {
    clientId: clientCount,
    x: x,
    y: y,
    color: color,
  };
  clients.set(socket, clientInfo);


  if (!grid) grid = initializeGrid(gridHeight, gridWidth)
  updateBroadcastGrid(wss, clients, grid)
  socket.send(JSON.stringify({
    type: 'init',
    color: color,
  }));

  socket.on('message', (message) => {
    const key = JSON.parse(message.toString()).key;
    if (key === 'restart') {
      // Reinitialize each client using their clientId
      clients.forEach((clientInfo, clientSocket) => {
        const { x, y, color } = initializeClient(clientInfo.clientId);
        clientInfo.x = x;
        clientInfo.y = y;
        clientInfo.color = color;
        clientSocket.send(JSON.stringify({
          type: 'init',
          color: color,
        }));
      });

      grid = initializeGrid(gridHeight, gridWidth);
      broadcastRestart(wss)
      updateBroadcastGrid(wss, clients, grid);
      
    }
    else if (key) {
      // Update the client's square position based on the key
      handleMovement(socket, key, clients);
      // Broadcast the updated grid to all clients
      updateBroadcastGrid(wss, clients, grid);
    }

  });

  socket.on('close', () => {
    console.log('Client disconnected');
    clientCount -= 1
    clients.delete(socket);
    updateBroadcastGrid(wss, clients, grid)
    if (clientCount == 0) grid = null
  });
});



function handleMovement(socket, moveKey, clients) {
  const clientInfo = clients.get(socket);
  let x = clientInfo.x
  let y = clientInfo.y
  let newX = x, newY = y;
  switch (moveKey) {
    case 'ArrowRight':
      newX = x < gridWidth - 1 ? (x + 1) : x;
      break;
    case 'ArrowLeft':
      newX = x > 0 ? (x - 1) : x;
      break;
    case 'ArrowUp':
      newY = y > 0 ? (y - 1) : y;
      break;
    case 'ArrowDown':
      newY = y < gridHeight - 1 ? (y + 1) : y;
      break;
  }

  if (grid[newY][newX] !== 'blocked') {
    clientInfo.x = newX;
    clientInfo.y = newY;
    clients.set(socket, clientInfo);

    if (isGameOver(clients)) {
      broadcastGameOver(wss);
    }
  }
}

function isGameOver(clients) {
  let redPosition;
  for (const [_, clientInfo] of clients) {
    if (clientInfo.color === 'red') {
      redPosition = { x: clientInfo.x, y: clientInfo.y };
      break;
    }
  }

  for (const [_, clientInfo] of clients) {
    if (clientInfo.color !== 'red' && clientInfo.x === redPosition.x && clientInfo.y === redPosition.y) {
      return true;
    }
  }
  return false;
}

function broadcastGameOver(wss) {
  const gameOverMessage = JSON.stringify({ type: 'gameOver' });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(gameOverMessage);
    }
  });
}

function broadcastRestart(wss) {
  const restartMessage = JSON.stringify({ type: 'restart' });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(restartMessage);
    }
  });
}

function initializeGrid(gridHeight, gridWidth) {

  const grid = [];

  // Initialize grid and randomly block cells
  for (let i = 0; i < gridHeight; i++) {
    const row = [];
    for (let j = 0; j < gridWidth; j++) {
      const isBlocked = Math.random() < 0.2; // 20% chance of being blocked
      row.push(isBlocked ? 'blocked' : 'open');
    }
    grid.push(row);
  }

  grid[0][0] = 'open'
  grid[0][gridWidth - 1] = 'open'
  grid[gridHeight - 1][0] = 'open'
  grid[gridHeight - 1][gridWidth - 1] = 'open'

  return grid
}

function initializeClient(clientCount) {
  console.log("initialize client")
  let x, y, color
  switch (clientCount) {
    case 1:
      x = 0
      y = 0
      color = 'red'
      break
    case 2:
      x = gridWidth - 1
      y = gridHeight - 1
      color = 'green'
      break
    case 3:
      x = gridWidth - 1
      y = 0
      color = 'blue'
      break
    case 4:
      x = gridHeight - 1
      y = 0
      color = 'yellow'
      break
  }
  return { x, y, color }
}

function updateBroadcastGrid(wss, clients, grid) {

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      grid[i][j] = grid[i][j] === 'blocked' ? 'blocked' : 'open';
    }
  }

  clients.forEach((clientInfo) => {
    grid[clientInfo.y][clientInfo.x] = clientInfo.color;
  });


  // Send the grid to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ grid }));
    }
  });
}

server.listen(8080, function () {
  console.log("server listening on port 8080")
});