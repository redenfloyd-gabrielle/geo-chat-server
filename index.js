const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const userRoutes = require('./routes/userRoutes');
const socketService = require('./services/websocket');

// Initialize Express app
const app = express();

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server);

// Use JSON middleware
app.use(express.json());

// Use API routes
app.use('/api', userRoutes);

// Initialize Socket.IO service
socketService(io);

// Serve static files (optional for front-end)
app.use(express.static(__dirname));

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
