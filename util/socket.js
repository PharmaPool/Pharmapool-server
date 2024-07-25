let socketIO;
module.exports = {
  init: (httpServer) => {
    const io = require("socket.io")(httpServer, {
      cors: {
        origin: "https://pharmapoolng.com",
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

// let connection;
// class Socket {
//   socket;
//   constructor() {
//     this.socket = null;
//   }

//   connect(server) {
//     const io = require("socket.io")(server, {
//       cors: {
//         origin: "https://pharmapoolng.com",
//       },
//     });
//     io.on("connection", (socket) => {
//       console.log("socket connected");
//       this.socket = socket;
//     });
//   }

//   emit(event, data) {
//     this.socket.emit(event, data);
//   }

//   on(event) {
//     this.socket.on(event, (result) => {
//       console.log(result);
//     });
//   }

//   static init(server) {
//     if (!connection) {
//       connection = new Socket();
//       connection.connect(server);
//     }
//   }

//   static getConnection() {
//     if (connection) {
//       return connection;
//     }
//   }
// }

// module.exports = {
//   init: Socket.init,
//   connect: Socket.getConnection,
// };
