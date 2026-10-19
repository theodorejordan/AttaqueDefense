// HTTP + Socket.IO server. `--dev` also serves the client through Vite (middleware mode, one port).
// The game itself lives in room.ts; this file only moves messages.
import { randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { IllegalMoveError, createRng } from '../engine/index.ts';
import type { ClientToServerEvents, Reply, ServerToClientEvents } from '../shared/protocol.ts';
import { Room } from './room.ts';
import { RoomError, parseRequest } from './validate.ts';

const PORT = Number(process.env.PORT ?? 3000);
const isDev = process.argv.includes('--dev');

const httpServer = createServer();

if (isDev) {
  // https://vite.dev/guide/ssr#setting-up-the-dev-server
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  // Added before Socket.IO, which then only lets non-Socket.IO requests through to Vite.
  httpServer.on('request', vite.middlewares);
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
const room = new Room({
  send: (clientId, update) => io.to(clientId).emit('update', update),
  rng: createRng(randomInt(2 ** 31)),
});

io.on('connection', (socket) => {
  const { token } = socket.handshake.auth as { token?: unknown };
  room.connect(socket.id, typeof token === 'string' ? token : undefined);
  socket.on('disconnect', () => room.disconnect(socket.id));

  // Payloads are untrusted, so they are typed `unknown` and checked here.
  socket.on('request', (payload: unknown, reply: unknown) => {
    const send = typeof reply === 'function' ? (reply as (reply: Reply) => void) : () => {};
    try {
      send({ ok: true, ...room.request(socket.id, parseRequest(payload)) });
    } catch (error) {
      if (error instanceof RoomError) {
        send({ ok: false, error: error.code, ...(error.message !== error.code && { detail: error.message }) });
      } else if (error instanceof IllegalMoveError) {
        send({ ok: false, error: 'illegalMove', detail: error.message });
      } else {
        console.error(error);
        send({ ok: false, error: 'serverError' });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`AttaqueDéfense: http://localhost:${PORT}${isDev ? ' (dev)' : ''}`);
});
