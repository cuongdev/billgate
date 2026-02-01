import 'dotenv/config';

import './models'; // Initialize associations
import express from 'express';
import cors from 'cors';
import routes from './routes/app.routes';
import webhookRoutes from './routes/webhook.routes';
import workflowRoutes from './routes/workflow.routes';
import path from 'path';


import http from 'http';
import { socketService } from './services/socket.service';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '5mb' }));

// API Routes
app.use('/api', routes);
app.use('/api', webhookRoutes);
app.use('/api', workflowRoutes);


// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexFile = path.join(__dirname, '../client/dist/index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(500).send('Client not built. Please run "npm run build" in the client directory.');
    }
  });
});

// Global error handler (must be after routes)
const isProduction = process.env.NODE_ENV === 'production';
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) return;
  if (isProduction) {
    console.error('[Error]', err?.message || err);
    if (err?.stack) console.error(err.stack);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  } else {
    console.error('[Error]', err?.message || err);
    if (err?.stack) console.error(err.stack);
    res.status(500).json({
      error: err?.message || 'An unexpected error occurred.',
      ...(err?.stack && { stack: err.stack })
    });
  }
});

// Initialize Socket.io
socketService.init(httpServer);

import { checkConnection } from './db/sequelize';

const startServer = async () => {
  try {
    const connected = await checkConnection();
    if (!connected) {
      throw new Error('Database connection failed. Ensure PostgreSQL is running and .env is configured.');
    }
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      import('./services/vpbank.service').then(({ vpbankService }) => {
        vpbankService.init();
      });
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
};

startServer();
