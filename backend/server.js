const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dns = require('dns');

// Configurar DNS do Google para resolver problemas de DNS
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Configure logging
const app = express();
const server = http.createServer(app);

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(morgan('combined'));

// CORS Configuration
app.use(cors({
  credentials: true,
  origin: ['http://localhost:3000', 'http://localhost:3000/', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Atlas connection error:', err.message));



// ==================== WEBSOCKET CONNECTION MANAGER ====================
class ConnectionManager {
  constructor() {
    this.activeConnections = [];
  }
  
  connect(ws) {
    this.activeConnections.push(ws);
    console.log(`WebSocket connected. Total connections: ${this.activeConnections.length}`);
    
    ws.on('close', () => {
      this.disconnect(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.disconnect(ws);
    });
  }
  
  disconnect(ws) {
    const index = this.activeConnections.indexOf(ws);
    if (index > -1) {
      this.activeConnections.splice(index, 1);
      console.log(`WebSocket disconnected. Total connections: ${this.activeConnections.length}`);
    }
  }
  
  broadcast(message) {
    const disconnected = [];
    this.activeConnections.forEach(ws => {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting:', error);
        disconnected.push(ws);
      }
    });
    
    disconnected.forEach(ws => this.disconnect(ws));
  }
}

const manager = new ConnectionManager();

// ==================== WEBSOCKET SERVER ====================
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws/notifications') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  manager.connect(ws);
});

// ==================== API ROUTES ====================
const apiRouter = express.Router();

apiRouter.get('/', (req, res) => {
  res.json({
    message: "DNVT - Sistema de Gestão de Acidentes de Trânsito",
    status: "online"
  });
});

apiRouter.get('/health', (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTH ENDPOINTS ====================
const { login, register, getMe } = require('./src/controllers/authController');

apiRouter.post('/auth/login', login);

apiRouter.get('/auth/me', getMe);

apiRouter.post('/auth/register', register);

// ==================== MONGOOSE MODELS ====================
const Acidente = require('./src/models/Acidente');
const Boletim = require('./src/models/Boletim');
const Assistencia = require('./src/models/Assistencia');
const ZonaCritica = require('./src/models/ZonaCritica');
const User = require('./src/models/User');
const AuditLog = require('./src/models/AuditLog');

// ==================== AUDIT HELPER ====================
async function logAudit({ user_id, user_name, acao, tipo, descricao, entidade_id, dados_anteriores, dados_novos, ip }) {
  try {
    await AuditLog.create({ user_id, user_name: user_name || 'Sistema', acao, tipo, descricao, entidade_id, dados_anteriores, dados_novos, ip });
  } catch (err) { console.error('Audit log error:', err.message); }
}

// ==================== PASSWORD GENERATOR ====================
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pass = '';
  for (let i = 0; i < length; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
}

// ==================== ACIDENTES ENDPOINTS ====================
apiRouter.get('/acidentes/ativos', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const acidentes = await Acidente.find({ status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] } }).sort({ created_at: -1 });
      return res.json(acidentes);
    }
  } catch (err) { console.error('DB error /acidentes/ativos:', err.message); }
  res.json([]);
});

apiRouter.get('/acidentes/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      // Try by _id first, then by acidente_id for seed data
      let acidente = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        acidente = await Acidente.findById(req.params.id);
      }
      if (!acidente) {
        acidente = await Acidente.findOne({ acidente_id: req.params.id });
      }
      if (acidente) return res.json(acidente);
      return res.status(404).json({ detail: 'Acidente não encontrado' });
    }
  } catch (err) { console.error('DB error /acidentes/:id:', err.message); }
  res.status(404).json({ detail: 'Acidente não encontrado' });
});

apiRouter.get('/acidentes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    if (mongoose.connection.readyState === 1) {
      const acidentes = await Acidente.find().sort({ created_at: -1 }).limit(limit);
      return res.json(acidentes);
    }
  } catch (err) { console.error('DB error /acidentes:', err.message); }
  res.json([]);
});

apiRouter.post('/acidentes', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const acidente = new Acidente(req.body);
      await acidente.save();
      manager.broadcast({ type: 'NOVO_ACIDENTE', data: acidente });
      return res.status(201).json(acidente);
    }
  } catch (err) { console.error('DB error POST /acidentes:', err.message); }
  res.status(500).json({ detail: 'Erro ao criar acidente' });
});

apiRouter.patch('/acidentes/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      // Extract operator name from JWT if available
      let operatorName = '';
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const usr = await User.findById(decoded.userId || decoded.id).select('name');
          if (usr) operatorName = usr.name;
        }
      } catch (_) {}

      const updateData = { ...req.body, updated_at: new Date() };
      if (operatorName) updateData.updated_by = operatorName;

      const acidente = await Acidente.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (acidente) {
        manager.broadcast({ type: 'ACIDENTE_ATUALIZADO', data: acidente });
        return res.json(acidente);
      }
      return res.status(404).json({ detail: 'Acidente não encontrado' });
    }
  } catch (err) { console.error('DB error PATCH /acidentes:', err.message); }
  res.status(500).json({ detail: 'Erro ao atualizar acidente' });
});

apiRouter.delete('/acidentes/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const acidente = await Acidente.findByIdAndDelete(req.params.id);
      if (acidente) return res.json({ message: 'Acidente removido' });
      return res.status(404).json({ detail: 'Acidente não encontrado' });
    }
  } catch (err) { console.error('DB error DELETE /acidentes:', err.message); }
  res.status(500).json({ detail: 'Erro ao remover acidente' });
});

// ==================== ESTATISTICAS ENDPOINTS ====================
apiRouter.get('/estatisticas/resumo', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const total = await Acidente.countDocuments();
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const acidentes_hoje = await Acidente.countDocuments({ created_at: { $gte: hoje } });
      const ativos = await Acidente.countDocuments({ status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] } });
      const grave = await Acidente.countDocuments({ gravidade: 'GRAVE' });
      const moderado = await Acidente.countDocuments({ gravidade: 'MODERADO' });
      const leve = await Acidente.countDocuments({ gravidade: 'LEVE' });
      const reportado = await Acidente.countDocuments({ status: 'REPORTADO' });
      const validado = await Acidente.countDocuments({ status: 'VALIDADO' });
      const em_atendimento = await Acidente.countDocuments({ status: 'EM_ATENDIMENTO' });
      const resolvido = await Acidente.countDocuments({ status: 'RESOLVIDO' });

      return res.json({
        total_acidentes: total,
        acidentes_hoje,
        acidentes_ativos: ativos,
        gravidade: { grave, moderado, leve },
        status: { reportado, validado, em_atendimento, resolvido }
      });
    }
  } catch (err) { console.error('DB error /estatisticas/resumo:', err.message); }
  res.json({ total_acidentes: 0, acidentes_hoje: 0, acidentes_ativos: 0, gravidade: { grave: 0, moderado: 0, leve: 0 }, status: { reportado: 0, validado: 0, em_atendimento: 0, resolvido: 0 } });
});

apiRouter.get('/estatisticas/por-hora', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await Acidente.aggregate([
        { $match: { created_at: { $type: 'date' } } },
        { $group: { _id: { $hour: '$created_at' }, acidentes: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const horas = Array.from({length: 24}, (_, i) => {
        const found = result.find(r => r._id === i);
        return { hora: i, acidentes: found ? found.acidentes : 0 };
      });
      return res.json(horas);
    }
  } catch (err) { console.error('DB error /estatisticas/por-hora:', err.message); }
  res.json(Array.from({length: 24}, (_, i) => ({ hora: i, acidentes: 0 })));
});

apiRouter.get('/estatisticas/por-dia-semana', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await Acidente.aggregate([
        { $match: { created_at: { $type: 'date' } } },
        { $group: { _id: { $dayOfWeek: '$created_at' }, acidentes: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const dias = nomes.map((dia, i) => {
        const found = result.find(r => r._id === (i + 1));
        return { dia, acidentes: found ? found.acidentes : 0 };
      });
      return res.json(dias);
    }
  } catch (err) { console.error('DB error /estatisticas/por-dia-semana:', err.message); }
  res.json(['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map(d => ({ dia: d, acidentes: 0 })));
});

apiRouter.get('/estatisticas/mensal', async (req, res) => {
  try {
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || (new Date().getMonth() + 1);
    if (mongoose.connection.readyState === 1) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      const result = await Acidente.aggregate([
        { $match: { created_at: { $gte: inicio, $lte: fim, $type: 'date' } } },
        { $group: { _id: { $dayOfMonth: '$created_at' }, acidentes: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const dados = Array.from({length: diasNoMes}, (_, i) => {
        const found = result.find(r => r._id === (i + 1));
        return { dia: i + 1, acidentes: found ? found.acidentes : 0 };
      });
      return res.json({ ano, mes, dados });
    }
  } catch (err) { console.error('DB error /estatisticas/mensal:', err.message); }
  res.json({ ano: req.query.ano || 2026, mes: req.query.mes || 3, dados: [] });
});

// ==================== CONFIGURAÇÕES ENDPOINTS ====================
apiRouter.get('/configuracoes/google-maps-key', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const config = await mongoose.connection.db.collection('configuracoes').findOne();
      if (config) return res.json({ api_key: config.google_maps_api_key || null });
    }
  } catch (err) { console.error('DB error /configuracoes/google-maps-key:', err.message); }
  res.json({ api_key: process.env.GOOGLE_MAPS_KEY || null });
});

apiRouter.get('/configuracoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const config = await mongoose.connection.db.collection('configuracoes').findOne();
      if (config) return res.json(config);
    }
  } catch (err) { console.error('DB error /configuracoes:', err.message); }
  res.json({ google_maps_api_key: null, sms_enabled: false });
});

apiRouter.patch('/configuracoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.collection('configuracoes').updateOne(
        {},
        { $set: { ...req.body, updated_at: new Date() } },
        { upsert: true }
      );
      
      await logAudit({ acao: 'atualizar_configuracoes', tipo: 'configuracao', descricao: 'Configurações do sistema atualizadas', ip: req.ip });
      
      // Return the updated config
      const updated = await mongoose.connection.db.collection('configuracoes').findOne();
      return res.json(updated || { message: 'Configurações atualizadas' });
    }
  } catch (err) { console.error('DB error PATCH /configuracoes:', err.message); }
  res.status(500).json({ error: 'Erro ao salvar configurações' });
});

// ==================== ASSISTÊNCIAS ENDPOINTS ====================
apiRouter.get('/assistencias', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (req.query.status) query.status = req.query.status;
      const assistencias = await Assistencia.find(query).sort({ hora_inicio: -1 });
      return res.json(assistencias);
    }
  } catch (err) { console.error('DB error /assistencias:', err.message); }
  res.json([]);
});

apiRouter.post('/assistencias', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const assistencia = new Assistencia(req.body);
      await assistencia.save();
      return res.status(201).json(assistencia);
    }
  } catch (err) { console.error('DB error POST /assistencias:', err.message); }
  res.status(500).json({ detail: 'Erro ao criar assistência' });
});

apiRouter.patch('/assistencias/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const assistencia = await Assistencia.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (assistencia) return res.json(assistencia);
      return res.status(404).json({ detail: 'Assistência não encontrada' });
    }
  } catch (err) { console.error('DB error PATCH /assistencias:', err.message); }
  res.status(500).json({ detail: 'Erro ao atualizar assistência' });
});

// ==================== ZONAS CRÍTICAS ENDPOINTS ====================
apiRouter.get('/zonas-criticas', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zonas = await ZonaCritica.find().sort({ nivel_risco: 1 });
      return res.json(zonas);
    }
  } catch (err) { console.error('DB error /zonas-criticas:', err.message); }
  res.json([]);
});

apiRouter.post('/zonas-criticas', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zona = new ZonaCritica(req.body);
      await zona.save();
      return res.status(201).json(zona);
    }
  } catch (err) { console.error('DB error POST /zonas-criticas:', err.message); }
  res.status(500).json({ detail: 'Erro ao criar zona' });
});

apiRouter.patch('/zonas-criticas/:id/validar', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zona = await ZonaCritica.findByIdAndUpdate(req.params.id, { validada: true }, { new: true });
      if (zona) return res.json(zona);
      return res.status(404).json({ detail: 'Zona não encontrada' });
    }
  } catch (err) { console.error('DB error PATCH /zonas-criticas:', err.message); }
  res.status(500).json({ detail: 'Erro ao validar zona' });
});

apiRouter.get('/zonas-criticas/calcular', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zonas = await ZonaCritica.find();
      return res.json({ message: 'Cálculo concluído', zonas });
    }
  } catch (err) { console.error('DB error /zonas-criticas/calcular:', err.message); }
  res.json({ message: 'Cálculo concluído', zonas: [] });
});

// ==================== BOLETINS ENDPOINTS ====================
apiRouter.get('/boletins', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletins = await Boletim.find().sort({ data: -1 });
      return res.json(boletins);
    }
  } catch (err) { console.error('DB error /boletins:', err.message); }
  res.json([]);
});

apiRouter.get('/boletins/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = await Boletim.findById(req.params.id);
      if (boletim) return res.json(boletim);
      return res.status(404).json({ detail: 'Boletim não encontrado' });
    }
  } catch (err) { console.error('DB error /boletins/:id:', err.message); }
  res.status(404).json({ detail: 'Boletim não encontrado' });
});

apiRouter.post('/boletins', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = new Boletim(req.body);
      await boletim.save();
      return res.status(201).json(boletim);
    }
  } catch (err) { console.error('DB error POST /boletins:', err.message); }
  res.status(500).json({ detail: 'Erro ao criar boletim' });
});

// ==================== UTILIZADORES ENDPOINTS ====================
apiRouter.get('/utilizadores', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      return res.json(users);
    }
  } catch (err) { console.error('DB error /utilizadores:', err.message); }
  res.json([]);
});

apiRouter.post('/utilizadores', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    
    const { name, email, telefone, bilhete_identidade, role, nivel_acesso, privilegios, endereco } = req.body;
    if (!name || !email || !telefone) return res.status(400).json({ error: 'Nome, email e telefone são obrigatórios' });
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email já está registado' });
    
    const password = generatePassword(10);
    const userRole = role || 'policia';
    const status = userRole === 'cidadao' ? 'pendente' : 'ativo';
    
    const defaultPrivilegios = userRole === 'admin' 
      ? { gestao_acidentes: true, gestao_boletins: true, gestao_zonas: true, gestao_assistencias: true, gestao_utilizadores: true, ver_estatisticas: true, configuracoes: true, exportar_dados: true }
      : userRole === 'policia'
      ? { gestao_acidentes: true, gestao_boletins: true, gestao_zonas: false, gestao_assistencias: true, gestao_utilizadores: false, ver_estatisticas: true, configuracoes: false, exportar_dados: true }
      : { gestao_acidentes: false, gestao_boletins: false, gestao_zonas: false, gestao_assistencias: false, gestao_utilizadores: false, ver_estatisticas: false, configuracoes: false, exportar_dados: false };
    
    const user = new User({
      name, email: email.toLowerCase(), password, telefone,
      bilhete_identidade: bilhete_identidade || '',
      endereco: endereco || '',
      role: userRole, status,
      nivel_acesso: nivel_acesso || (userRole === 'admin' ? 'total' : 'basico'),
      privilegios: privilegios || defaultPrivilegios
    });
    
    await user.save();
    
    await logAudit({ acao: 'criar_utilizador', tipo: 'utilizador', descricao: `Utilizador ${name} (${email}) criado com perfil ${userRole}`, entidade_id: user._id.toString(), ip: req.ip });
    
    const userObj = user.toObject();
    delete userObj.password;
    
    return res.status(201).json({ ...userObj, senha_gerada: password });
  } catch (err) {
    console.error('DB error POST /utilizadores:', err.message);
    res.status(500).json({ error: err.message || 'Erro ao criar utilizador' });
  }
});

// /me must be before /:id to avoid "me" being treated as an ID
apiRouter.patch('/utilizadores/me', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const { password, role, status, privilegios, nivel_acesso, ...updateData } = req.body;
    
    const user = await User.findByIdAndUpdate(decoded.userId || decoded.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    
    return res.json(user);
  } catch (err) { console.error('DB error PATCH /utilizadores/me:', err.message); }
  res.status(500).json({ error: 'Erro ao atualizar perfil' });
});

apiRouter.patch('/utilizadores/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    
    const { password, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    
    await logAudit({ acao: 'editar_utilizador', tipo: 'utilizador', descricao: `Utilizador ${user.name} atualizado`, entidade_id: user._id.toString(), ip: req.ip });
    
    return res.json(user);
  } catch (err) { console.error('DB error PATCH /utilizadores:', err.message); }
  res.status(500).json({ error: 'Erro ao atualizar utilizador' });
});

apiRouter.patch('/utilizadores/:id/aprovar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    
    const user = await User.findByIdAndUpdate(req.params.id, {
      status: 'ativo',
      aprovado_em: new Date()
    }, { new: true }).select('-password');
    
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    
    await logAudit({ acao: 'aprovar_utilizador', tipo: 'utilizador', descricao: `Cidadão ${user.name} aprovado`, entidade_id: user._id.toString(), ip: req.ip });
    
    // TODO: Send SMS notification to user.telefone about approval
    
    return res.json({ ...user.toObject(), sms_enviado: true });
  } catch (err) { console.error('DB error PATCH /utilizadores/:id/aprovar:', err.message); }
  res.status(500).json({ error: 'Erro ao aprovar utilizador' });
});

apiRouter.patch('/utilizadores/:id/reset-senha', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    
    const newPassword = generatePassword(10);
    user.password = newPassword;
    await user.save();
    
    await logAudit({ acao: 'reset_senha', tipo: 'utilizador', descricao: `Senha de ${user.name} redefinida por admin`, entidade_id: user._id.toString(), ip: req.ip });
    
    // TODO: Send SMS with new password to user.telefone
    
    return res.json({ message: 'Senha redefinida com sucesso', telefone: user.telefone, nova_senha: newPassword, sms_enviado: true });
  } catch (err) { console.error('DB error reset-senha:', err.message); }
  res.status(500).json({ error: 'Erro ao redefinir senha' });
});

apiRouter.patch('/utilizadores/:id/suspender', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'suspenso' }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    
    await logAudit({ acao: 'suspender_utilizador', tipo: 'utilizador', descricao: `Utilizador ${user.name} suspenso`, entidade_id: user._id.toString(), ip: req.ip });
    
    return res.json(user);
  } catch (err) { console.error('DB error suspender:', err.message); }
  res.status(500).json({ error: 'Erro ao suspender utilizador' });
});

// ==================== AUDIT LOG ENDPOINTS ====================
apiRouter.get('/historico', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const limit = parseInt(req.query.limit) || 100;
      const tipo = req.query.tipo;
      const query = tipo && tipo !== 'all' ? { tipo } : {};
      const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit);
      return res.json(logs);
    }
  } catch (err) { console.error('DB error /historico:', err.message); }
  res.json([]);
});

// ==================== SMS ENDPOINTS ====================
apiRouter.post('/sms/enviar', async (req, res) => {
  try {
    const { phone_number, message } = req.body;
    if (!phone_number || !message) return res.status(400).json({ success: false, error: 'Número e mensagem são obrigatórios' });
    
    // Get Ombala config
    let config = {};
    if (mongoose.connection.readyState === 1) {
      config = await mongoose.connection.db.collection('configuracoes').findOne() || {};
    }
    
    const token = config.ombala_token;
    const senderName = config.ombala_sender_name || 'DNVT';
    
    if (!token) return res.json({ success: false, error: 'Token Ombala não configurado. Configure nas Configurações.' });
    
    // Call Ombala SMS API
    try {
      const smsRes = await fetch('https://api.ombala.ao/v1/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ to: phone_number, from: senderName, message })
      });
      
      if (smsRes.ok) {
        const data = await smsRes.json();
        await logAudit({ acao: 'enviar_sms', tipo: 'sistema', descricao: `SMS enviado para ${phone_number}`, ip: req.ip });
        return res.json({ success: true, data });
      } else {
        const errData = await smsRes.text();
        return res.json({ success: false, error: `Erro da API Ombala: ${errData}` });
      }
    } catch (smsErr) {
      return res.json({ success: false, error: `Erro de conexão com Ombala: ${smsErr.message}` });
    }
  } catch (err) {
    console.error('SMS send error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

apiRouter.get('/sms/saldo', async (req, res) => {
  try {
    let config = {};
    if (mongoose.connection.readyState === 1) {
      config = await mongoose.connection.db.collection('configuracoes').findOne() || {};
    }
    
    const token = config.ombala_token;
    if (!token) return res.json({ saldo: null, error: 'Token Ombala não configurado' });
    
    try {
      const balRes = await fetch('https://api.ombala.ao/v1/account/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (balRes.ok) {
        const data = await balRes.json();
        return res.json({ saldo: data.balance || data.saldo || 0 });
      } else {
        return res.json({ saldo: null, error: 'Erro ao consultar saldo' });
      }
    } catch (balErr) {
      return res.json({ saldo: null, error: `Erro de conexão: ${balErr.message}` });
    }
  } catch (err) {
    console.error('SMS balance error:', err.message);
    res.json({ saldo: null, error: err.message });
  }
});

apiRouter.post('/rotas/verificar-acidentes', async (req, res) => {
  try {
    const { lat_origem, lng_origem, lat_destino, lng_destino } = req.body;
    
    if (!lat_origem || !lng_origem || !lat_destino || !lng_destino) {
      return res.status(400).json({ detail: 'Coordenadas são obrigatórias' });
    }
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ possui_acidentes: false, total_acidentes: 0, acidentes: [] });
    }
    
    const minLat = Math.min(lat_origem, lat_destino) - 0.01;
    const maxLat = Math.max(lat_origem, lat_destino) + 0.01;
    const minLng = Math.min(lng_origem, lng_destino) - 0.01;
    const maxLng = Math.max(lng_origem, lng_destino) + 0.01;
    
    const acidentes = await Acidente.find({
      status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] },
      latitude: { $gte: minLat, $lte: maxLat },
      longitude: { $gte: minLng, $lte: maxLng }
    }).limit(100);
    
    res.json({
      possui_acidentes: acidentes.length > 0,
      total_acidentes: acidentes.length,
      acidentes
    });
  } catch (error) {
    console.error('Error checking accidents:', error);
    res.status(500).json({ detail: 'Erro interno' });
  }
});

app.use('/api', apiRouter);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`DNVT Server running on port ${PORT}`);
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, server, manager };
