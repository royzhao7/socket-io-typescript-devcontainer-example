import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { time } from 'node:console';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// open the database file
const db = await open({
  filename: 'chat.db',
  driver: sqlite3.Database
});

// create our 'messages' table (you can ignore the 'client_offset' column for now)
await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT
  );
`);


const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});
const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// io.on('connection', (socket) => {
    
//   console.log('a user connected');
//   socket.on('disconnect', () => {
//     console.log('user disconnected');
//   });
// });

io.on('connection', async(socket) => {
    socket.on('chat message', async (msg) => {
      console.log('message: ' + msg);
      let result;
      try {
        // store the message in the database
        result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
      } catch (e) {
        // TODO handle the failure
        return;
      }
      io.emit('chat message', msg, result.lastID);
    });
  
      console.log('socket recovered:'+socket.recovered)
      console.log('socket serverOffset:'+socket.handshake.auth.serverOffset)
      if (!socket.recovered) {
        // if the connection state recovery was not successful
        try {
          await db.each('SELECT id, content FROM messages WHERE id > ?',
            [socket.handshake.auth.serverOffset || 0],
            (_err, row) => {
              socket.emit('chat message', row.content, row.id);
            }
          )
        } catch (e) {
          // something went wrong
        }
      }
 

    // socket.on('hello', (msg) => {
    //     console.log('hello: ' + msg);
    //     let randomNum = Math.random();
    //     io.emit('hello', msg+randomNum);
    //   });
    // socket.onAnyOutgoing((eventName, ...args) => {
    //     console.log(eventName); // 'hello'
    //     console.log(args); // [ 1, '2', { 3: '4', 5: ArrayBuffer (1) [ 6 ] } ]
    //   });
    // socket.on('request', (arg1, arg2, callback) => {
    //     console.log(arg1); // { foo: 'bar' }
    //     console.log(arg2); // 'baz'
    //     callback({
    //       status: 'ok'
    //     });
    //   });

    //   socket.timeout(5000).emit('request', { foo: 'bar' }, 'baz', (err, response) => {
    //     if (err) {
    //       // the client did not acknowledge the event in the given delay
    //     } else {
    //       console.log(response.status); // 'ok'
    //     }
    //   });
    // io.on('connection', (socket) => {
    //     socket.on('request', (arg1, arg2, callback) => {
    //       console.log(arg1); // { foo: 'bar' }
    //       console.log(arg2); // 'baz'
          
    //       callback({
            
    //         status: 'ok'
    //       });
    //     });
    //   });

      
  });

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});