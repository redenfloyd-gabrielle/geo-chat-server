const { Server } = require('socket.io');

module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Starting Socket.IO server...');
    // Allow WebSocket connections
    const io = new Server(res.socket.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket'],
    });

    io.on('connection', (socket) => {
      console.log('A user connected', socket.id);

      socket.on('joinChannel', (channelName) => {
        console.log(`User ${socket.id} joining channel: ${channelName}`);
        socket.join(channelName);
        io.to(channelName).emit('message', `User ${socket.id} has joined the channel: ${channelName}`);
      });

      socket.on('leaveChannel', (channelName) => {
        socket.leave(channelName);
        console.log(`User ${socket.id} left channel: ${channelName}`);
        io.to(channelName).emit('message', `User ${socket.id} has left the channel: ${channelName}`);
      });

      socket.on('message', (msg) => {
        console.log('Message received:', msg);
        io.emit('message', msg);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });

    // This is a workaround to make sure Vercel keeps the WebSocket server alive.
    res.socket.server.io = io;
  }
  res.status(200).send('WebSocket server is running');

};