// DNVT Backend API - Vercel Serverless
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const Boletim = require('./src/models/Boletim');
const Acidente = require('./src/models/Acidente');

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

app.get('/api/estatisticas/pdf', async (req, res) => {
  try {
    const ano = parseInt(req.query.ano, 10) || new Date().getFullYear();
    const mes = parseInt(req.query.mes, 10) || (new Date().getMonth() + 1);

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59, 999);

    const [total, graves, fatais, moderados, leves, porGravidade, porCausa, porTipo, totaisAgregados] = await Promise.all([
      Acidente.countDocuments({ created_at: { $gte: inicio, $lte: fim } }),
      Acidente.countDocuments({ created_at: { $gte: inicio, $lte: fim }, gravidade: 'GRAVE' }),
      Acidente.countDocuments({ created_at: { $gte: inicio, $lte: fim }, gravidade: 'FATAL' }),
      Acidente.countDocuments({ created_at: { $gte: inicio, $lte: fim }, gravidade: 'MODERADO' }),
      Acidente.countDocuments({ created_at: { $gte: inicio, $lte: fim }, gravidade: 'LEVE' }),
      Acidente.aggregate([
        { $match: { created_at: { $gte: inicio, $lte: fim } } },
        { $group: { _id: '$gravidade', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Acidente.aggregate([
        { $match: { created_at: { $gte: inicio, $lte: fim }, causa_principal: { $nin: [null, '', 'N/A'] } } },
        { $group: { _id: '$causa_principal', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Acidente.aggregate([
        { $match: { created_at: { $gte: inicio, $lte: fim }, tipo_acidente: { $nin: [null, '', 'N/A'] } } },
        { $group: { _id: '$tipo_acidente', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Acidente.aggregate([
        { $match: { created_at: { $gte: inicio, $lte: fim } } },
        { $group: { _id: null, totalVeiculos: { $sum: '$numero_veiculos' }, totalVitimas: { $sum: '$numero_vitimas' } } }
      ])
    ]);

    const stats = totaisAgregados[0] || { totalVeiculos: 0, totalVitimas: 0 };
    const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 50, right: 50 } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_estatisticas_${ano}_${mes}.pdf`);
    doc.pipe(res);

    const primaryColor = '#1E40AF';
    const lightGray = '#F3F4F6';
    const textColor = '#1F2937';
    const borderColor = '#E5E7EB';
    let y = 50;

    try {
      const logoGovPath = path.join(__dirname, 'public', 'img', 'logo-g.png');
      const logoDnvtPath = path.join(__dirname, 'public', 'img', 'Logo_DTSER.png');
      if (fs.existsSync(logoGovPath)) doc.image(logoGovPath, 50, y, { width: 50, height: 65 });
      if (fs.existsSync(logoDnvtPath)) doc.image(logoDnvtPath, 480, y, { width: 60, height: 60 });
    } catch (error) {
      console.error('Erro ao adicionar logos ao PDF de estatísticas:', error);
    }

    doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold').text('GOVERNO DE ANGOLA', 120, y + 5);
    doc.fontSize(14).fillColor(textColor).font('Helvetica').text('Direcção Nacional de Viação e Trânsito', 120, y + 30);
    doc.fontSize(12).fillColor('#6B7280').font('Helvetica').text(`Relatório de Estatísticas - ${mes}/${ano}`, 120, y + 50);
    y = 130;
    doc.moveTo(50, y).lineTo(545, y).stroke(borderColor);
    y += 20;

    const ensureSpace = (neededHeight) => {
      if (y + neededHeight > 730) {
        doc.addPage();
        y = 60;
      }
    };

    const createTable = (title, headers, rows) => {
      ensureSpace(60 + (rows.length * 20));
      const startY = y;
      doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text(title, 50, y);
      y += 25;
      const colWidth = 495 / headers.length;
      doc.rect(50, y, 495, 25).fill(lightGray);
      headers.forEach((header, i) => {
        doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(header, 55 + (i * colWidth), y + 8, { width: colWidth - 10 });
      });
      y += 25;
      rows.forEach((row, rowIdx) => {
        const rowColor = rowIdx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(50, y, 495, 20).fill(rowColor);
        row.forEach((cell, i) => {
          doc.fontSize(9).fillColor(textColor).font('Helvetica').text(String(cell), 55 + (i * colWidth), y + 5, { width: colWidth - 10 });
        });
        y += 20;
      });
      doc.rect(50, startY + 25, 495, 25 + (rows.length * 20)).stroke(borderColor);
      y += 15;
    };

    createTable('RESUMO GERAL', ['Indicador', 'Quantidade'], [
      ['Total de Acidentes', total],
      ['Acidentes Graves', graves],
      ['Acidentes Fatais', fatais],
      ['Acidentes Moderados', moderados],
      ['Acidentes Leves', leves],
      ['Total de Veículos Envolvidos', stats.totalVeiculos],
      ['Total de Vítimas', stats.totalVitimas]
    ]);

    if (porGravidade.length > 0) {
      createTable('DISTRIBUICAO POR GRAVIDADE', ['Gravidade', 'Quantidade'], porGravidade.map((item) => [item._id || 'Não Especificado', item.count]));
    }

    const causaRows = porCausa.map((item, idx) => [idx + 1, String(item._id).replace(/_/g, ' '), item.count]);
    if (causaRows.length > 0) {
      createTable('PRINCIPAIS CAUSAS', ['#', 'Causa', 'Quantidade'], causaRows);
    }

    const tipoRows = porTipo.map((item, idx) => [idx + 1, String(item._id).replace(/_/g, ' '), item.count]);
    if (tipoRows.length > 0) {
      createTable('TIPOS DE ACIDENTES', ['#', 'Tipo', 'Quantidade'], tipoRows);
    }

    doc.fontSize(8).fillColor('#9CA3AF').font('Helvetica').text(`Gerado em ${new Date().toLocaleString('pt-AO')}`, 50, 750, { align: 'center', width: 495 });
    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF de estatísticas:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erro ao gerar PDF', detail: error.message });
    }
  }
});

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
