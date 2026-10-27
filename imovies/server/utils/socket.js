let io = null;

exports.init = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  });
  io.on('connection', (socket) => {
    socket.on('show:join', (showId) => socket.join(`show:${showId}`));
    socket.on('show:leave', (showId) => socket.leave(`show:${showId}`));
  });
  return io;
};

// seats: [{ label, status }]
exports.emitSeatUpdate = (showId, seats) => {
  if (io && seats && seats.length) {
    io.to(`show:${showId}`).emit('seat:update', { showId: String(showId), seats });
  }
};
