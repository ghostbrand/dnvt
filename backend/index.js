// DNVT Backend API - Vercel Serverless Wrapper for Express
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection (with caching for serverless)
let cachedDb = null;

async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  
  try {
    const db = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    cachedDb = db;
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Import models
require('./src/models/User');
require('./src/models/Acidente');
require('./src/models/ZonaCritica');
require('./src/models/Delegacao');

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      message: 'DNVT API is running'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Import and use routes (only if they exist)
try {
  const authRoutes = require('./src/routes/auth');
  const acidentesRoutes = require('./src/routes/acidentes');
  const utilizadoresRoutes = require('./src/routes/utilizadores');
  const delegacoesRoutes = require('./src/routes/delegacoes');
  const zonasRoutes = require('./src/routes/zonas');
  const estatisticasRoutes = require('./src/routes/estatisticas');
  const notificacoesRoutes = require('./src/routes/notificacoes');

  // Middleware to ensure DB connection before routes
  app.use('/api', async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      res.status(500).json({ error: 'Database connection failed' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/acidentes', acidentesRoutes);
  app.use('/api/utilizadores', utilizadoresRoutes);
  app.use('/api/delegacoes', delegacoesRoutes);
  app.use('/api/zonas', zonasRoutes);
  app.use('/api/estatisticas', estatisticasRoutes);
  app.use('/api/notificacoes', notificacoesRoutes);
} catch (error) {
  console.log('Routes not found, using basic endpoints only');
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DNVT Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      acidentes: '/api/acidentes',
      utilizadores: '/api/utilizadores',
      delegacoes: '/api/delegacoes',
      zonas: '/api/zonas',
      estatisticas: '/api/estatisticas',
      notificacoes: '/api/notificacoes'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Export for Vercel serverless
module.exports = app;
