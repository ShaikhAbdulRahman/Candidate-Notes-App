const jwt = require('jsonwebtoken');

module.exports = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      
      if (!token) {
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || userId;
      socket.userEmail = decoded.email;
            next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id} for user: ${socket.userId}`);
    socket.join(`user-${socket.userId}`);
    console.log(`Socket ${socket.id} auto-joined personal notification room: user-${socket.userId}`);
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} explicitly joined user room: user-${userId}`);
    });

    socket.on('join-candidate-room', (candidateId) => {
      socket.join(`candidate-${candidateId}`);
      console.log(`Socket ${socket.id} joined candidate room: candidate-${candidateId}`);
    });

    socket.on('leave-candidate-room', (candidateId) => {
      socket.leave(`candidate-${candidateId}`);
      console.log(`Socket ${socket.id} left candidate room: candidate-${candidateId}`);
    });
    socket.on('test-connection', (data) => {
      console.log(`Test connection from user: ${data.userId}`);
      socket.emit('test-response', { message: 'Connection working', userId: data.userId });
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
};