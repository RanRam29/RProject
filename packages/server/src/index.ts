import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import createApp from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = http.createServer(app);

// Initialize WebSocket server
import { initializeWebSocket } from './ws/ws.server.js';
initializeWebSocket(server);

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

export default server;