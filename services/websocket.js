module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected', socket.id);


    // Listen for the "join channel" event from a client
    socket.on('joinChannel', (channelName) => {
      console.log(`User ${socket.id} is joining channel: ${channelName}`);

      // Join the channel (room)
      socket.join(channelName);

      // Notify everyone in the room (including the sender) about the new member
      io.to(channelName).emit('message', `User ${socket.id} has joined the channel: ${channelName}`);
    });

    // Listen for the event to leave a channel (room)
    socket.on('leaveChannel', (channelName) => {
      socket.leave(channelName);
      console.log(`User ${socket.id} left channel: ${channelName}`);

      // Notify others in the room
      io.to(channelName).emit('message', `User ${socket.id} has left the channel: ${channelName}`);
    });

    // Handle chat messages
    socket.on('message', (msg) => {
      console.log('Message received:', msg);
      io.emit('message', msg);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};
