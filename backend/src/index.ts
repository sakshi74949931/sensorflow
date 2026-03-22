import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/connection';
import { createSchema } from './db/schema';
import { seedDefaultUsers } from './db/seed';
import { setLiveEmitter } from './db/queries';
import { errorHandler } from './utils/errors';
import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import monitoringRoutes from './routes/monitoring';
import alarmRoutes from './routes/alarms';
import reportRoutes from './routes/reports';
import locationRoutes from './routes/locations';
import eventRoutes from './routes/events';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '5000', 10);

// Socket.IO setup
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Wire up live emitter (avoids circular import in queries.ts)
setLiveEmitter((data) => io.emit('live-reading', data));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Sound Sense Flow API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/events', eventRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    status: 404,
    path: req.path,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function start() {
  try {
    const dbConnected = await initializeDatabase();
    if (dbConnected) {
      await createSchema();        // create tables if they don't exist
      await seedDefaultUsers();    // insert default admin/authority/support users if empty
    } else {
      console.warn('⚠️  Database connection failed - running in demo mode with mock data');
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ Sound Sense Flow Backend Started`);
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log(`📝 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log('\n📚 API Endpoints:');
      console.log('   POST   /api/auth/login');
      console.log('   POST   /api/auth/register');
      console.log('   GET    /api/devices');
      console.log('   POST   /api/devices');
      console.log('   PUT    /api/devices/:id');
      console.log('   DELETE /api/devices/:id');
      console.log('   GET    /api/monitoring');
      console.log('   POST   /api/monitoring');
      console.log('   GET    /api/alarms');
      console.log('   PATCH  /api/alarms/:id/resolve');
      console.log('   GET    /api/reports');
      console.log('   POST   /api/reports\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
