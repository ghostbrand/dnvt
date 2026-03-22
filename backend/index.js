// DNVT Backend API - Vercel Serverless
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const Boletim = require('./src/models/Boletim');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Create Express app
const app = express();

app.set('etag', false);

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

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

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
const anotacoesModel = require('./src/models/Anotacao');

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
app.use('/api/agentes', agentesRoutes);
app.use('/api/historico', historicoRoutes);

app.get('/api/agentes/ativos-localizacao', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const users = await mongoose.connection.db.collection('users')
      .find({ role: { $in: ['policia', 'admin'] }, status: 'ativo' })
      .project({ password: 0 })
      .toArray();
    const locData = await mongoose.connection.db.collection('agentes_a_caminho')
      .find({ updated_at: { $gte: new Date(Date.now() - 3600000) } })
      .toArray();
    const locMap = {};
    locData.forEach((item) => { locMap[item.agente_id] = item; });
    return res.json(users.map((user) => ({
      _id: user._id,
      name: user.name || user.nome || '',
      email: user.email || '',
      telefone: user.telefone || '',
      role: user.role || '',
      provincia: user.provincia || '',
      latitude: locMap[user._id.toString()]?.latitude || null,
      longitude: locMap[user._id.toString()]?.longitude || null,
      last_seen: locMap[user._id.toString()]?.updated_at || null
    })));
  } catch (error) {
    console.error('Erro ao buscar agentes ativos com localização:', error);
    return res.json([]);
  }
});

app.get('/api/anotacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const query = {};
    if (req.query.acidente_id) query.acidente_id = req.query.acidente_id;
    const anotacoes = await anotacoesModel.find(query).sort({ created_at: -1 });
    return res.json(anotacoes);
  } catch (error) {
    console.error('Erro ao listar anotações:', error);
    return res.json([]);
  }
});

app.post('/api/anotacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB indisponível' });
    const { acidente_id, agente_id, agente_nome, texto, fotos } = req.body;
    if (!acidente_id || !agente_id) return res.status(400).json({ error: 'acidente_id e agente_id são obrigatórios' });
    if (!texto && (!fotos || fotos.length === 0)) return res.status(400).json({ error: 'Texto ou foto são obrigatórios' });
    let tipo = 'TEXTO';
    if (texto && fotos && fotos.length > 0) tipo = 'TEXTO_FOTO';
    else if (fotos && fotos.length > 0) tipo = 'FOTO';
    const anotacao = await anotacoesModel.create({
      acidente_id,
      agente_id,
      agente_nome: agente_nome || '',
      tipo,
      texto: texto || '',
      fotos: fotos || []
    });
    return res.status(201).json(anotacao);
  } catch (error) {
    console.error('Erro ao criar anotação:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/anotacoes/upload-foto', async (req, res) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) return res.status(400).json({ error: 'base64 é obrigatório' });
    const dataUri = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    return res.json({ url: dataUri, filename: filename || `foto_${Date.now()}.jpg` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/uploads/boletins/:filename', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    const boletim = await Boletim.findOne({ arquivo_url: { $regex: req.params.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } });
    if (!boletim) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    return res.redirect(302, `/api/boletins/${boletim._id}/pdf`);
  } catch (error) {
    console.error('Erro ao resolver arquivo de boletim:', error);
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

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
