const socketHandler = (io, socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', { userId: socket.id });
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`Client ${socket.id} left room: ${roomId}`);
    socket.to(roomId).emit('user-left', { userId: socket.id });
  });

  // Send message
  socket.on('send-message', (data) => {
    const { roomId, message, userId } = data;
    console.log(`Message from ${socket.id} to room ${roomId}:`, message);

    io.to(roomId).emit('new-message', {
      userId: userId || socket.id,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // Payment status update
  socket.on('payment-status', (data) => {
    const { paymentIntentId, status } = data;
    console.log(`Payment status update: ${paymentIntentId} - ${status}`);

    // Broadcast to all clients in the payment room
    io.to(`payment-${paymentIntentId}`).emit('payment-update', {
      paymentIntentId,
      status,
      timestamp: new Date().toISOString(),
    });
  });

  // Custom event handler 
  socket.on('custom-event', (data) => {
    console.log('Custom event received:', data);
    // Handle custom events here
    socket.emit('custom-event-response', {
      received: true,
      data,
      timestamp: new Date().toISOString(),
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
};

module.exports = socketHandler;

