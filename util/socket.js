module.exports = {
  init: (httpServer) => {
    const io = require("socket.io")(httpServer, {
      cors: {
        origin: "https://pharmapoolng.com/",
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
