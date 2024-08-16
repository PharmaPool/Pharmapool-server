module.exports = {
  init: (httpServer) => {
    const io = require("socket.io")(httpServer, {
      cors: {
        origin: "http://localhost:3000",
      },
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket IO connection not established");
    }
    return io;
  },
};
