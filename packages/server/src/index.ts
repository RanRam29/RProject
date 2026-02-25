import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import createApp from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

// ADD THESE 3 LINES: Health check endpoint for the Android app
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const server = http.createServer(app);

// Initialize WebSocket server
import { initializeWebSocket } from './ws/ws.server.js';
initializeWebSocket(server);

// Start due date reminder scheduler
import { startDueDateReminders } from './modules/emails/due-date-reminder.js';

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
  startDueDateReminders();
});

export default server;