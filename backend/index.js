// DNVT Backend API - Vercel Serverless
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Create Express app
const app = express();

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.CORS_ORIGINS === '*') return callback(null, true);
    callback(null, true); // Allow all for development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with caching for serverless
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

// Middleware to ensure DB connection before routes
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Import routes
const authRoutes = require('./src/routes/auth');
const acidentesRoutes = require('./src/routes/acidentes');
const zonasRoutes = require('./src/routes/zonas');
const delegacoesRoutes = require('./src/routes/delegacoes');
const estatisticasRoutes = require('./src/routes/estatisticas');
const utilizadoresRoutes = require('./src/routes/utilizadores');
const notificacoesRoutes = require('./src/routes/notificacoes');
const assistenciasRoutes = require('./src/routes/assistencias');
const boletinsRoutes = require('./src/routes/boletins');
const configuracoesRoutes = require('./src/routes/configuracoes');
const agentesRoutes = require('./src/routes/agentes');
const historicoRoutes = require('./src/routes/historico');

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    message: 'DNVT API is running'
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/acidentes', acidentesRoutes);
app.use('/api/zonas-criticas', zonasRoutes);
app.use('/api/delegacoes', delegacoesRoutes);
app.use('/api/estatisticas', estatisticasRoutes);
app.use('/api/utilizadores', utilizadoresRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/assistencias', assistenciasRoutes);
app.use('/api/boletins', boletinsRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/agentes-a-caminho', agentesRoutes);
app.use('/api/historico', historicoRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DNVT Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      acidentes: '/api/acidentes',
      zonas: '/api/zonas-criticas',
      delegacoes: '/api/delegacoes',
      estatisticas: '/api/estatisticas',
      utilizadores: '/api/utilizadores'
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
