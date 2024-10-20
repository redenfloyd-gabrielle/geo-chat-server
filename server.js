const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const userRoutes = require('./routes/api/v1/users');
const channeRoutes = require('./routes/api/v1/channels')
const messageRoutes = require('./routes/api/v1/messages')
const authRoutes = require('./routes/api/auth/auth');
const socketService = require('./services/websocket');
const cors = require('cors');

// Initialize Express app
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
  allowedHeaders: ['Content-Type'], // Allow specific headers
  credentials: true // Allow credentials such as cookies
}));


// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173', // Allow your Vue app
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Use JSON middleware
app.use(express.json());

// Use API routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/channels', channeRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/auth', authRoutes);

// Endpoint to return all available routes
app.get('/api/routes', (req, res) => {
  const routes = listRoutes();
  res.json({ availableRoutes: routes });
});

function listRoutes() {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Handle routes registered directly on the app
      const method = Object.keys(middleware.route.methods)[0].toUpperCase();
      const path = cleanPath(middleware.route.path);
      routes.push({ method, path });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // For routers, iterate through the stack
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          const routePath = cleanPath(handler.route.path);
          const basePath = middleware.regexp.source
            .replace(/^\^/, '')
            .replace(/\\\//g, '/')
            .replace(/\/$/, ''); // Clean up base path

          // Combine base and specific route paths
          routes.push({ method, path: cleanPath(basePath + routePath) });
        }
      });
    }
  });

  return routes;
}

// Helper function to clean path
function cleanPath(path) {
  return path
    .replace(/\/\?(\(\?=.*\)|\(\?=\/)/g, '') // Remove optional regex patterns
    .replace(/\/:([^/]+)/g, '/$1') // Convert :param to /param
    .replace(/\/uuid/g, '/<uuid>') // Replace /uuid with /<uuid>
    .replace(/\/{2,}/g, '/') // Remove any duplicate slashes
    .replace(/\/$/, ''); // Remove trailing slashes
}

// Catch-all route for undefined endpoints
app.all('*', (req, res) => {
  return res.status(404).json({ status: "fail", error: "Endpoint does not exist" });
});

// Initialize Socket.IO service
socketService(io);

// Serve static files (optional for front-end)
app.use(express.static(__dirname));


// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
