const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const userRoutes = require('./routes/api/v1/users');
const channeRoutes = require('./routes/api/v1/channels')
const messageRoutes = require('./routes/api/v1/messages')
const locationRoutes = require('./routes/api/v1/locations')
const friendshipRoutes = require('./routes/api/v1/friendships')
const authRoutes = require('./routes/api/auth');
const socketService = require('./services/websocket');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY; // Replace with an environment variable in production

// Initialize Express app
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  credentials: true // Allow credentials such as cookies
}));

// Middleware to validate JWT token
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // Get token from 'Authorization' header

  if (!token) {
    return res.status(403).json({ status: "fail", error: 'Token is required' });
  }

  // Verify the token
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ status: "fail", error: 'Token has expired' });
      }
      return res.status(401).json({ status: "fail", error: 'Invalid token' });
    }

    req.user = decoded; // Attach decoded user info
    next();
  });
}

// Use JSON middleware
app.use(express.json());

// Use API routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/channels', channeRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/friendships', friendshipRoutes);
// Use API routes with authentication middleware
// app.use('/api/v1/users', authenticateToken, userRoutes);
// app.use('/api/v1/channels', authenticateToken, channeRoutes);
// app.use('/api/v1/messages', authenticateToken, messageRoutes);
// app.use('/api/v1/locations', authenticateToken, locationRoutes);
// app.use('/api/v1/friendships', authenticateToken, friendshipRoutes);
// app.use('/api/auth', authRoutes);

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

// Serve static files (optional for front-end)
app.use(express.static(__dirname));

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow your Vue app
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Initialize Socket.IO service
socketService(io);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
