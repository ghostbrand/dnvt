const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Configure app
const app = express();

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(morgan('combined'));

// CORS Configuration
const corsOrigins = process.env.CORS_ORIGINS || '*';
app.use(cors({
  credentials: corsOrigins !== '*',
  origin: corsOrigins === '*' ? true : corsOrigins.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api/', limiter);

// ==================== DATABASE CONNECTION ====================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

// ==================== ROUTES ====================
// Import routes
const authRoutes = require('./src/routes/auth');
const acidentesRoutes = require('./src/routes/acidentes');
const utilizadoresRoutes = require('./src/routes/utilizadores');
const delegacoesRoutes = require('./src/routes/delegacoes');
const zonasRoutes = require('./src/routes/zonas');
const estatisticasRoutes = require('./src/routes/estatisticas');
const notificacoesRoutes = require('./src/routes/notificacoes');

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// API Router
const apiRouter = express.Router();

// Connect to DB before handling requests
apiRouter.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/acidentes', acidentesRoutes);
apiRouter.use('/utilizadores', utilizadoresRoutes);
apiRouter.use('/delegacoes', delegacoesRoutes);
apiRouter.use('/zonas', zonasRoutes);
apiRouter.use('/estatisticas', estatisticasRoutes);
apiRouter.use('/notificacoes', notificacoesRoutes);

app.use('/api', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Export for Vercel serverless
module.exports = app;
