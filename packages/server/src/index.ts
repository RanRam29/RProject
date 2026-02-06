import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import createApp from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

// Initialize WebSocket server
import { initializeWebSocket } from './ws/ws.server';
initializeWebSocket(server);

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

export default server;
