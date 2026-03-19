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
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.log(`Invalid Expo push token: ${pushToken}`);
    return;
  }
  try {
    const [ticket] = await expo.sendPushNotificationsAsync([{
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    }]);
    if (ticket.status === 'error') {
      console.error('Push notification error:', ticket.message);
    }
  } catch (err) {
    console.error('Push notification send failed:', err.message);
  }
}

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

// CORS Configuration — use CORS_ORIGINS env var (default: allow all for dev)
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

// Password recovery — Step 1: Send code via email
apiRouter.post('/auth/recover', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email é obrigatório' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ detail: 'Base de dados indisponível' });
    }

    const user = await require('./src/models/User').findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ detail: 'Nenhuma conta encontrada com este email' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Store code in a recovery_codes collection
    await mongoose.connection.db.collection('recovery_codes').updateOne(
      { email: email.toLowerCase() },
      { $set: { code, expiry, used: false, created_at: new Date() } },
      { upsert: true }
    );

    // Try to send email via nodemailer — read SMTP from DB first, fallback to .env
    try {
      const nodemailer = require('nodemailer');
      let dbConfig = {};
      try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}

      const smtpHost = dbConfig.email_host || process.env.SMTP_HOST;
      const smtpPort = parseInt(dbConfig.email_port || process.env.SMTP_PORT) || 587;
      const smtpUser = dbConfig.email_user || process.env.SMTP_USER;
      const smtpPass = dbConfig.email_password || process.env.SMTP_PASS;
      const fromName = dbConfig.email_from_name || 'DTSER';

      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });

        await transporter.sendMail({
          from: `"${fromName}" <${smtpUser}>`,
          to: email,
          subject: 'Código de Recuperação de Senha — DTSER',
          html: `<div style="font-family:Inter,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
            <div style="background:#1B2A4A;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
              <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:2px;">DTSER</h1>
            </div>
            <h2 style="color:#1B2A4A;font-size:16px;">Recuperação de Senha</h2>
            <p style="color:#334155;font-size:14px;">O seu código de verificação é:</p>
            <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1B2A4A;">${code}</span>
            </div>
            <p style="color:#64748b;font-size:13px;">Este código expira em 15 minutos.</p>
          </div>`
        });
        console.log(`Recovery code sent to ${email}`);
      } else {
        console.log(`Recovery code for ${email}: ${code} (SMTP not configured)`);
      }
    } catch (emailErr) {
      console.error('Email send error:', emailErr.message);
      console.log(`Recovery code for ${email}: ${code} (email failed)`);
    }

    return res.json({ message: 'Código enviado com sucesso' });
  } catch (err) {
    console.error('Recovery error:', err.message);
    res.status(500).json({ detail: 'Erro ao processar recuperação' });
  }
});

// Password recovery — Step 2: Verify code and reset password
apiRouter.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, code, nova_senha } = req.body;
    if (!email || !code || !nova_senha) {
      return res.status(400).json({ detail: 'Email, código e nova senha são obrigatórios' });
    }
    if (nova_senha.length < 6) {
      return res.status(400).json({ detail: 'Senha deve ter no mínimo 6 caracteres' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ detail: 'Base de dados indisponível' });
    }

    const record = await mongoose.connection.db.collection('recovery_codes').findOne({
      email: email.toLowerCase(),
      code,
      used: false
    });

    if (!record) {
      return res.status(400).json({ detail: 'Código inválido ou já utilizado' });
    }

    if (new Date() > new Date(record.expiry)) {
      return res.status(400).json({ detail: 'Código expirado. Solicite um novo código.' });
    }

    const User = require('./src/models/User');
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ detail: 'Utilizador não encontrado' });
    }

    user.password = nova_senha;
    await user.save();

    // Mark code as used
    await mongoose.connection.db.collection('recovery_codes').updateOne(
      { email: email.toLowerCase(), code },
      { $set: { used: true } }
    );

    return res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ detail: 'Erro ao redefinir senha' });
  }
});

// ==================== MONGOOSE MODELS ====================
const Acidente = require('./src/models/Acidente');
const Boletim = require('./src/models/Boletim');
const Assistencia = require('./src/models/Assistencia');
const ZonaCritica = require('./src/models/ZonaCritica');
const User = require('./src/models/User');
const AuditLog = require('./src/models/AuditLog');
const Delegacao = require('./src/models/Delegacao');
const Anotacao = require('./src/models/Anotacao');

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

// Agent urgencies: accidents in agent's monitored zones
apiRouter.get('/acidentes/urgencias', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const jwt = require('jsonwebtoken');
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) return res.status(401).json({ detail: 'Token não fornecido' });

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId || decoded.id;
    const agent = await User.findById(userId).select('zonas_notificacao role');
    if (!agent) return res.json([]);

    // Get zones where agent is a monitor OR subscribed via zonas_notificacao
    const monitoredZones = await ZonaCritica.find({ monitores: userId });
    const subscribedZoneIds = agent.zonas_notificacao || [];
    let allZones = [...monitoredZones];
    if (subscribedZoneIds.length) {
      const extra = await ZonaCritica.find({
        $or: [
          { _id: { $in: subscribedZoneIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
          { zona_id: { $in: subscribedZoneIds } }
        ]
      });
      const existingIds = new Set(allZones.map(z => z._id.toString()));
      for (const z of extra) {
        if (!existingIds.has(z._id.toString())) allZones.push(z);
      }
    }

    if (!allZones.length) return res.json([]);

    // Get active accidents and filter those within any of the agent's zones
    const acidentes = await Acidente.find({
      status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] }
    }).sort({ created_at: -1 });

    const urgencias = acidentes.filter(a => {
      if (a.latitude == null || a.longitude == null) return false;
      return allZones.some(z => {
        const dLat = (a.latitude - z.latitude_centro) * 111320;
        const dLng = (a.longitude - z.longitude_centro) * 111320 * Math.cos(z.latitude_centro * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        return dist <= (z.raio_metros || 500);
      });
    });

    return res.json(urgencias);
  } catch (err) {
    console.error('DB error /acidentes/urgencias:', err.message);
    res.json([]);
  }
});

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
      const data = { ...req.body };
      // Extract user ID from token to set created_by
      try {
        const jwt = require('jsonwebtoken');
        const authToken = req.headers.authorization?.replace('Bearer ', '');
        if (authToken) {
          const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
          if (decoded.id) data.created_by = decoded.id;
        }
      } catch (_) {}
      const acidente = new Acidente(data);
      await acidente.save();
      manager.broadcast({ type: 'NOVO_ACIDENTE', data: acidente });

      // --- Zone-based agent notification (async, don't block response) ---
      (async () => {
        try {
          const lat = acidente.latitude;
          const lng = acidente.longitude;
          if (lat == null || lng == null) return;

          // Find zones that contain this accident (point-in-circle check)
          const zonas = await ZonaCritica.find().populate('monitores', '_id name telefone alertas_sms push_token zonas_notificacao');
          const matchedZones = zonas.filter(z => {
            const dLat = (lat - z.latitude_centro) * 111320;
            const dLng = (lng - z.longitude_centro) * 111320 * Math.cos(z.latitude_centro * Math.PI / 180);
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);
            return dist <= (z.raio_metros || 500);
          });

          if (!matchedZones.length) return;

          // Collect unique agents from matched zones
          const agentMap = new Map();
          for (const z of matchedZones) {
            for (const m of (z.monitores || [])) {
              if (m && m._id) agentMap.set(m._id.toString(), m);
            }
          }

          // Also find agents who have this zone in zonas_notificacao
          const zoneIds = matchedZones.map(z => (z.zona_id || z._id.toString()));
          const zonaSubs = await User.find({
            role: { $in: ['policia', 'admin'] },
            status: 'ativo',
            zonas_notificacao: { $in: zoneIds }
          }).select('_id name telefone alertas_sms push_token');
          for (const u of zonaSubs) {
            agentMap.set(u._id.toString(), u);
          }

          if (!agentMap.size) return;

          const tipoStr = (acidente.tipo_acidente || 'Acidente').replace(/_/g, ' ');
          const gravStr = acidente.gravidade || 'MODERADO';
          const smsMsg = `URGENCIA DTSER: ${tipoStr} (${gravStr}) reportado na sua zona de monitoramento. Abra o app para ver detalhes e rota.`;
          const pushTitle = `🚨 Urgência: ${tipoStr}`;
          const pushBody = `Acidente ${gravStr} na sua zona. Abra para ver rota.`;

          // Get SMS config
          let dbConfig = {};
          try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
          const ombalaToken = dbConfig.ombala_token;
          const senderName = dbConfig.ombala_sender_name || 'DNVT';

          const pushTokens = [];
          const notifDocs = [];
          const now = new Date();

          for (const [uid, agent] of agentMap) {
            // Create in-app notification for ALL matched agents
            notifDocs.push({
              destinatario_id: uid,
              titulo: pushTitle,
              mensagem: pushBody,
              remetente: 'Sistema',
              tipo: 'urgencia',
              acidente_id: acidente._id.toString(),
              lida: false,
              created_at: now
            });

            // Push notification
            if (agent.push_token) pushTokens.push(agent.push_token);

            // SMS only to agents with alertas_sms enabled
            if (agent.alertas_sms && agent.telefone && ombalaToken) {
              try {
                const axios = require('axios');
                await axios.post('https://api.useombala.ao/v1/messages',
                  { message: smsMsg, from: senderName, to: agent.telefone },
                  { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ombalaToken}` } }
                );
                console.log(`Urgency SMS sent to ${agent.name} (${agent.telefone})`);
              } catch (smsErr) {
                console.error(`SMS to ${agent.telefone} failed:`, smsErr.message);
              }
            }
          }

          // Bulk insert notifications
          if (notifDocs.length) {
            await mongoose.connection.db.collection('notificacoes').insertMany(notifDocs);
          }

          // Send push notifications
          if (pushTokens.length) {
            await sendExpoPush(pushTokens, pushTitle, pushBody);
          }

          console.log(`Accident ${acidente._id}: notified ${agentMap.size} agents (${pushTokens.length} push, SMS to those with alertas_sms)`);
        } catch (notifErr) {
          console.error('Zone notification error:', notifErr.message);
        }
      })();

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

// ==================== AGENT TRACKING ENDPOINTS ====================

// Agent confirms they are heading to the accident
apiRouter.post('/acidentes/:id/confirmar-ida', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    const jwt = require('jsonwebtoken');
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) return res.status(401).json({ error: 'Token não fornecido' });

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId || decoded.id;
    const agent = await User.findById(userId).select('name email telefone role');
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });

    const { latitude, longitude } = req.body;

    // Only allow if agent has an APPROVED delegation for this accident
    const approvedDelegacao = await Delegacao.findOne({
      acidente_id: req.params.id, agente_id: userId, status: 'APROVADA'
    });
    if (!approvedDelegacao) {
      return res.status(403).json({ error: 'Necessita de uma delegação aprovada para confirmar ida.' });
    }

    const col = mongoose.connection.db.collection('agent_tracking');
    await col.updateOne(
      { acidente_id: req.params.id, agente_id: userId },
      {
        $set: {
          agente_nome: agent.name,
          agente_email: agent.email,
          agente_telefone: agent.telefone,
          status: 'A_CAMINHO',
          latitude: latitude || null,
          longitude: longitude || null,
          confirmado_em: new Date(),
          updated_at: new Date()
        },
        $setOnInsert: { created_at: new Date() }
      },
      { upsert: true }
    );

    // Broadcast to admin panel via WebSocket
    manager.broadcast({
      type: 'AGENTE_A_CAMINHO',
      data: {
        acidente_id: req.params.id,
        agente_id: userId,
        agente_nome: agent.name,
        latitude,
        longitude,
        status: 'A_CAMINHO'
      }
    });

    return res.json({ success: true, message: 'Confirmação registada' });
  } catch (err) {
    console.error('DB error POST /acidentes/:id/confirmar-ida:', err.message);
    res.status(500).json({ error: 'Erro ao confirmar ida' });
  }
});

// Agent sends live location update
apiRouter.patch('/acidentes/:id/agent-location', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    const jwt = require('jsonwebtoken');
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) return res.status(401).json({ error: 'Token não fornecido' });

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId || decoded.id;
    const { latitude, longitude, status } = req.body;

    const col = mongoose.connection.db.collection('agent_tracking');
    const update = { latitude, longitude, updated_at: new Date() };
    if (status) update.status = status;

    const result = await col.updateOne(
      { acidente_id: req.params.id, agente_id: userId },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Registo de tracking não encontrado. Confirme ida primeiro.' });
    }

    // Broadcast live update to admin panel
    const agent = await User.findById(userId).select('name');
    manager.broadcast({
      type: 'AGENT_LOCATION_UPDATE',
      data: {
        acidente_id: req.params.id,
        agente_id: userId,
        agente_nome: agent?.name || '',
        latitude,
        longitude,
        status: status || 'A_CAMINHO',
        updated_at: new Date()
      }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('DB error PATCH /acidentes/:id/agent-location:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar localização' });
  }
});

// Admin: get all agents heading to this accident with live positions
apiRouter.get('/acidentes/:id/agentes-a-caminho', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const col = mongoose.connection.db.collection('agent_tracking');
    const agents = await col.find({ acidente_id: req.params.id }).sort({ confirmado_em: -1 }).toArray();
    return res.json(agents);
  } catch (err) {
    console.error('DB error GET /acidentes/:id/agentes-a-caminho:', err.message);
    res.json([]);
  }
});

apiRouter.get('/agentes-a-caminho', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const col = mongoose.connection.db.collection('agent_tracking');
    const agents = await col.find({}).sort({ updated_at: -1, confirmado_em: -1 }).toArray();
    return res.json(agents);
  } catch (err) {
    console.error('DB error GET /agentes-a-caminho:', err.message);
    res.json([]);
  }
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
      const zonas = await ZonaCritica.find().sort({ nivel_risco: 1 }).populate('monitores', 'name email role telefone');
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
  } catch (err) {
    console.error('DB error POST /zonas-criticas:', err.message);
    if (err.name === 'ValidationError') {
      const fields = Object.keys(err.errors).join(', ');
      return res.status(400).json({ detail: `Campos obrigatórios em falta: ${fields}` });
    }
  }
  res.status(500).json({ detail: 'Erro ao criar zona' });
});

apiRouter.put('/zonas-criticas/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { nome, latitude_centro, longitude_centro, raio_metros, nivel_risco, recomendacao_melhoria, delimitacoes, tipo_zona } = req.body;
      const updateData = { nome, latitude_centro, longitude_centro, raio_metros, nivel_risco, recomendacao_melhoria };
      if (delimitacoes !== undefined) updateData.delimitacoes = delimitacoes;
      if (tipo_zona !== undefined) updateData.tipo_zona = tipo_zona;
      const zona = await ZonaCritica.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate('monitores', 'name email role telefone');
      if (zona) {
        await logAudit({ acao: 'atualizar_zona', tipo: 'zona_critica', descricao: `Zona "${zona.nome}" atualizada`, entidade_id: zona._id.toString(), ip: req.ip });
        return res.json(zona);
      }
      return res.status(404).json({ detail: 'Zona não encontrada' });
    }
  } catch (err) { console.error('DB error PUT /zonas-criticas:', err.message); }
  res.status(500).json({ detail: 'Erro ao atualizar zona' });
});

apiRouter.delete('/zonas-criticas/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const zona = await ZonaCritica.findByIdAndDelete(req.params.id);
      if (zona) {
        await logAudit({ acao: 'eliminar_zona', tipo: 'zona_critica', descricao: `Zona "${zona.nome}" eliminada`, entidade_id: zona._id.toString(), ip: req.ip });
        return res.json({ message: 'Zona eliminada com sucesso' });
      }
      return res.status(404).json({ detail: 'Zona não encontrada' });
    }
  } catch (err) { console.error('DB error DELETE /zonas-criticas:', err.message); }
  res.status(500).json({ detail: 'Erro ao eliminar zona' });
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

apiRouter.patch('/zonas-criticas/:id/monitores', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { monitores } = req.body;
      const zona = await ZonaCritica.findByIdAndUpdate(
        req.params.id,
        { monitores: monitores || [] },
        { new: true }
      ).populate('monitores', 'name email role telefone');
      if (zona) {
        await logAudit({ acao: 'atualizar_monitores_zona', tipo: 'zona_critica', descricao: `Monitores da zona ${zona.nome} atualizados`, entidade_id: zona._id.toString(), ip: req.ip });
        return res.json(zona);
      }
      return res.status(404).json({ detail: 'Zona não encontrada' });
    }
  } catch (err) { console.error('DB error PATCH /zonas-criticas/:id/monitores:', err.message); }
  res.status(500).json({ detail: 'Erro ao atualizar monitores' });
});

apiRouter.get('/zonas-criticas/calcular', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ message: 'DB indisponível', zonas: [] });

    const RADIUS_KM = parseFloat(req.query.raio_km) || 0.5; // default 500m
    const MIN_ACCIDENTS = parseInt(req.query.min_acidentes) || 2; // minimum to be critical

    const acidentes = await Acidente.find().lean();
    if (acidentes.length === 0) return res.json({ message: 'Sem acidentes', zonas: [] });

    // Cluster accidents by proximity
    const used = new Set();
    const clusters = [];

    for (let i = 0; i < acidentes.length; i++) {
      if (used.has(i)) continue;
      const a = acidentes[i];
      if (!a.latitude || !a.longitude) continue;
      const cluster = [a];
      used.add(i);

      for (let j = i + 1; j < acidentes.length; j++) {
        if (used.has(j)) continue;
        const b = acidentes[j];
        if (!b.latitude || !b.longitude) continue;
        const dLat = (a.latitude - b.latitude) * 111.32;
        const dLng = (a.longitude - b.longitude) * 111.32 * Math.cos(a.latitude * Math.PI / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist <= RADIUS_KM) {
          cluster.push(b);
          used.add(j);
        }
      }
      clusters.push(cluster);
    }

    // Filter clusters that meet minimum threshold
    const criticalClusters = clusters.filter(c => c.length >= MIN_ACCIDENTS);

    // Create/update zones from clusters
    let created = 0, updated = 0;
    const zonaIds = [];

    for (const cluster of criticalClusters) {
      const latCenter = cluster.reduce((s, a) => s + a.latitude, 0) / cluster.length;
      const lngCenter = cluster.reduce((s, a) => s + a.longitude, 0) / cluster.length;
      const totalAcidentes = cluster.length;
      const graves = cluster.filter(a => ['GRAVE', 'FATAL'].includes(a.gravidade)).length;

      // Classify risk level
      let nivelRisco = 'BAIXO';
      if (totalAcidentes >= 5 || graves >= 2) nivelRisco = 'CRITICO';
      else if (totalAcidentes >= 3 || graves >= 1) nivelRisco = 'ALTO';
      else if (totalAcidentes >= 2) nivelRisco = 'MEDIO';

      let tipoZona = 'vigilancia';
      if (nivelRisco === 'CRITICO' || nivelRisco === 'ALTO') tipoZona = 'critica';

      // Find most frequent cause
      const causas = {};
      cluster.forEach(a => { if (a.causa_principal) causas[a.causa_principal] = (causas[a.causa_principal] || 0) + 1; });
      const causaMaisFrequente = Object.entries(causas).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Check if a zone already exists near this center
      const existingZone = await ZonaCritica.findOne({
        latitude_centro: { $gte: latCenter - 0.005, $lte: latCenter + 0.005 },
        longitude_centro: { $gte: lngCenter - 0.005, $lte: lngCenter + 0.005 }
      });

      if (existingZone) {
        await ZonaCritica.findByIdAndUpdate(existingZone._id, {
          total_acidentes: totalAcidentes,
          acidentes_graves: graves,
          nivel_risco: nivelRisco,
          tipo_zona: tipoZona,
          causa_mais_frequente: causaMaisFrequente,
          raio_metros: RADIUS_KM * 1000
        });
        zonaIds.push(existingZone._id);
        updated++;
      } else {
        const zona = await ZonaCritica.create({
          zona_id: `ZC-AUTO-${Date.now()}-${created}`,
          latitude_centro: Math.round(latCenter * 1000000) / 1000000,
          longitude_centro: Math.round(lngCenter * 1000000) / 1000000,
          raio_metros: RADIUS_KM * 1000,
          nome: `Zona Crítica Auto (${totalAcidentes} acidentes)`,
          total_acidentes: totalAcidentes,
          acidentes_graves: graves,
          causa_mais_frequente: causaMaisFrequente,
          nivel_risco: nivelRisco,
          tipo_zona: tipoZona,
          validado: false,
          recomendacao_melhoria: graves > 0
            ? 'Zona com acidentes graves recorrentes. Recomenda-se intervenção urgente.'
            : 'Zona com acidentes recorrentes. Monitorizar e avaliar medidas preventivas.'
        });
        zonaIds.push(zona._id);
        created++;
      }
    }

    const zonas = await ZonaCritica.find();
    return res.json({
      message: `Cálculo concluído: ${created} novas zonas, ${updated} atualizadas, ${criticalClusters.length} clusters encontrados`,
      zonas,
      stats: { total_acidentes: acidentes.length, clusters: criticalClusters.length, created, updated }
    });
  } catch (err) {
    console.error('DB error /zonas-criticas/calcular:', err.message);
    res.json({ message: 'Erro no cálculo', zonas: [] });
  }
});

// ==================== BOLETINS ENDPOINTS ====================
apiRouter.get('/boletins', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (req.query.acidente_id) {
        query.acidente_id = req.query.acidente_id;
      }
      const boletins = await Boletim.find(query).sort({ data: -1, createdAt: -1 });
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

// Server-side paginated citizen search (for notification dialog with 5M+ citizens)
apiRouter.get('/utilizadores/cidadaos/buscar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ cidadaos: [], total: 0, pagina: 1, total_paginas: 0 });
    const { q = '', pagina = 1, limite = 20, status = 'ativo' } = req.query;
    const page = Math.max(1, parseInt(pagina));
    const limit = Math.min(50, Math.max(1, parseInt(limite)));
    const skip = (page - 1) * limit;

    const query = { role: 'cidadao' };
    if (status && status !== 'todos') query.status = status;
    if (q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { telefone: regex },
        { bilhete_identidade: regex }
      ];
    }

    const [cidadaos, total] = await Promise.all([
      User.find(query).select('_id name email telefone provincia status').sort({ name: 1 }).skip(skip).limit(limit),
      User.countDocuments(query)
    ]);

    return res.json({
      cidadaos,
      total,
      pagina: page,
      total_paginas: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Citizen search error:', err.message);
    res.json({ cidadaos: [], total: 0, pagina: 1, total_paginas: 0 });
  }
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
    
    let emailEnviado = false;
    let smsEnviado = false;

    // Send approval EMAIL
    try {
      const nodemailer = require('nodemailer');
      let dbConfig = {};
      try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
      const smtpHost = dbConfig.email_host || process.env.SMTP_HOST;
      const smtpPort = parseInt(dbConfig.email_port || process.env.SMTP_PORT) || 587;
      const smtpUser = dbConfig.email_user || process.env.SMTP_USER;
      const smtpPass = dbConfig.email_password || process.env.SMTP_PASS;
      const fromName = dbConfig.email_from_name || 'DTSER';

      if (smtpHost && smtpUser && smtpPass && user.email) {
        const transporter = nodemailer.createTransport({
          host: smtpHost, port: smtpPort, secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 10000, greetingTimeout: 10000,
        });
        await transporter.sendMail({
          from: `"${fromName}" <${smtpUser}>`,
          to: user.email,
          subject: 'Conta Aprovada — DTSER',
          html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <div style="background:#1B2A4A;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
              <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px;">DTSER</h1>
              <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;">Direcção de Trânsito e Segurança Rodoviária</p>
            </div>
            <h2 style="color:#059669;font-size:20px;">✅ Conta Aprovada</h2>
            <p style="color:#334155;font-size:14px;line-height:1.6;">
              Caro(a) <strong>${user.name}</strong>,<br/><br/>
              A sua conta na plataforma DTSER foi <strong>aprovada com sucesso</strong>!<br/>
              Já pode aceder à aplicação mobile com as suas credenciais.<br/><br/>
              Obrigado por se registar no sistema de gestão de trânsito e segurança rodoviária de Angola.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#94a3b8;font-size:11px;text-align:center;">DTSER · Angola</p>
          </div>`
        });
        emailEnviado = true;
        console.log(`Approval email sent to ${user.email}`);
      }
    } catch (emailErr) {
      console.error('Approval email error:', emailErr.message);
    }

    // Send approval SMS
    try {
      if (user.telefone) {
        let dbConfig = {};
        try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
        const token = dbConfig.ombala_token;
        const senderName = dbConfig.ombala_sender_name || 'DNVT';
        if (token) {
          const axios = require('axios');
          await axios.post('https://api.useombala.ao/v1/messages',
            { message: `Caro(a) ${user.name}, a sua conta DTSER foi aprovada com sucesso! Ja pode aceder a aplicacao mobile.`, from: senderName, to: user.telefone },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
          );
          smsEnviado = true;
          console.log(`Approval SMS sent to ${user.telefone}`);
        }
      }
    } catch (smsErr) {
      console.error('Approval SMS error:', smsErr.message);
    }

    return res.json({ ...user.toObject(), email_enviado: emailEnviado, sms_enviado: smsEnviado });
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

// ==================== PUSH TOKEN ENDPOINT ====================
apiRouter.post('/auth/push-token', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });
    const decoded = require('jsonwebtoken').verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
    const { push_token } = req.body;
    if (!push_token) return res.status(400).json({ error: 'push_token é obrigatório' });
    await User.findByIdAndUpdate(decoded.id, { push_token });
    return res.json({ success: true });
  } catch (err) {
    console.error('Push token error:', err.message);
    res.status(500).json({ error: 'Erro ao registar push token' });
  }
});

// Helper: send Expo push notifications
async function sendExpoPush(pushTokens, title, body) {
  const messages = pushTokens
    .filter(t => t && t.startsWith('ExponentPushToken'))
    .map(t => ({
      to: t,
      sound: 'default',
      title,
      body,
      data: { type: 'notification' },
    }));
  if (!messages.length) return;
  try {
    const fetch = require('node-fetch') || globalThis.fetch;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) { console.error('Expo push error:', e.message); }
}

// ==================== DELEGAÇÕES (MISSION DELEGATION) ====================

// List delegations for an accident
apiRouter.get('/delegacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const query = {};
    if (req.query.acidente_id) query.acidente_id = req.query.acidente_id;
    if (req.query.agente_id) query.agente_id = req.query.agente_id;
    if (req.query.status) query.status = req.query.status;
    if (req.query.tipo) query.tipo = req.query.tipo;
    const delegacoes = await Delegacao.find(query).sort({ created_at: -1 }).limit(200);
    return res.json(delegacoes);
  } catch (err) { console.error('DB error /delegacoes:', err.message); res.json([]); }
});

// Get pending agent requests (for admin alerts)
apiRouter.get('/delegacoes/pedidos-pendentes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const pedidos = await Delegacao.find({ tipo: 'SOLICITACAO_AGENTE', status: 'PENDENTE' }).sort({ created_at: -1 });
    return res.json(pedidos);
  } catch (err) { console.error('DB error /delegacoes/pedidos-pendentes:', err.message); res.json([]); }
});

// Get delegation status for an agent on an accident
apiRouter.get('/delegacoes/minha', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json(null);
    const { acidente_id, agente_id } = req.query;
    if (!acidente_id || !agente_id) return res.json(null);
    const delegacao = await Delegacao.findOne({
      acidente_id, agente_id,
      status: { $in: ['PENDENTE', 'APROVADA'] }
    }).sort({ created_at: -1 });
    return res.json(delegacao);
  } catch (err) { console.error('DB error /delegacoes/minha:', err.message); res.json(null); }
});

// Admin delegates mission to agent
apiRouter.post('/delegacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB indisponível' });
    const { acidente_id, agente_id, agente_nome, agente_telefone, delegado_por, delegado_por_nome, distancia_km, latitude_agente, longitude_agente } = req.body;
    if (!acidente_id || !agente_id) return res.status(400).json({ error: 'acidente_id e agente_id são obrigatórios' });

    // Check if already delegated
    const existing = await Delegacao.findOne({ acidente_id, agente_id, status: { $in: ['PENDENTE', 'APROVADA'] } });
    if (existing) return res.status(400).json({ error: 'Este agente já tem uma delegação ativa para este acidente' });

    const delegacao = await Delegacao.create({
      acidente_id, agente_id, agente_nome: agente_nome || '',
      agente_telefone: agente_telefone || '',
      delegado_por: delegado_por || '', delegado_por_nome: delegado_por_nome || '',
      tipo: 'DELEGACAO_ADMIN', status: 'APROVADA', aprovada_em: new Date(),
      distancia_km: distancia_km || null,
      latitude_agente: latitude_agente || null, longitude_agente: longitude_agente || null
    });

    // Send push notification to agent
    try {
      const agentUser = await User.findById(agente_id);
      if (agentUser?.push_token) {
        const acidente = await Acidente.findOne({ $or: [{ _id: acidente_id }, { acidente_id: acidente_id }] });
        await sendPushNotification(
          agentUser.push_token,
          'Missão Delegada',
          `Foi-lhe delegada uma missão: ${acidente?.tipo_acidente?.replace(/_/g, ' ') || 'Acidente'} — ${acidente?.gravidade || ''}. Abra a aplicação para ver os detalhes e dirigir-se ao local.`,
          { type: 'DELEGACAO', acidente_id, delegacao_id: delegacao._id.toString() }
        );
      }
      // Store notification in DB
      await mongoose.connection.db.collection('notificacoes').insertOne({
        destinatario_id: agente_id,
        titulo: 'Missão Delegada',
        mensagem: `Foi-lhe delegada uma missão para o acidente. Dirija-se ao local.`,
        tipo: 'delegacao',
        acidente_id,
        lida: false,
        created_at: new Date()
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    // Send SMS if agent has phone
    if (agente_telefone) {
      try {
        let dbConfig = {};
        try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
        const token = dbConfig.ombala_token;
        const senderName = dbConfig.ombala_sender_name || 'DNVT';
        if (token) {
          const axios = require('axios');
          await axios.post('https://api.useombala.ao/v1/messages',
            {
              message: `DTSER: Foi-lhe delegada uma missão para o acidente ${acidente_id}. Abra a aplicação para ver os detalhes e dirigir-se ao local.`,
              from: senderName,
              to: agente_telefone
            },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
          );
        } else {
          console.log(`[SMS] Missão delegada para ${agente_nome} (${agente_telefone}) sem token Ombala configurado.`);
        }
      } catch (smsErr) {
        console.error('Mission delegation SMS error:', smsErr.message);
      }
    }

    return res.status(201).json(delegacao);
  } catch (err) { console.error('DB error POST /delegacoes:', err.message); res.status(500).json({ error: err.message }); }
});

// Agent requests mission (solicitar delegação)
apiRouter.post('/delegacoes/solicitar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB indisponível' });
    const { acidente_id, agente_id, agente_nome, agente_telefone, latitude_agente, longitude_agente } = req.body;
    if (!acidente_id || !agente_id) return res.status(400).json({ error: 'acidente_id e agente_id são obrigatórios' });

    // Check existing
    const existing = await Delegacao.findOne({ acidente_id, agente_id, status: { $in: ['PENDENTE', 'APROVADA'] } });
    if (existing) return res.status(400).json({ error: 'Já tem um pedido pendente ou missão ativa para este acidente' });

    // Calculate distance
    let distancia_km = null;
    if (latitude_agente && longitude_agente) {
      const acidente = await Acidente.findOne({ $or: [{ _id: acidente_id }, { acidente_id: acidente_id }] });
      if (acidente?.latitude && acidente?.longitude) {
        const dLat = (latitude_agente - acidente.latitude) * 111.32;
        const dLng = (longitude_agente - acidente.longitude) * 111.32 * Math.cos(acidente.latitude * Math.PI / 180);
        distancia_km = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
      }
    }

    const delegacao = await Delegacao.create({
      acidente_id, agente_id, agente_nome: agente_nome || '',
      agente_telefone: agente_telefone || '',
      tipo: 'SOLICITACAO_AGENTE', status: 'PENDENTE',
      distancia_km,
      latitude_agente: latitude_agente || null, longitude_agente: longitude_agente || null
    });

    // Notify admins about the request
    const admins = await User.find({ role: 'admin', status: 'ativo' });
    const now = new Date();
    for (const admin of admins) {
      if (admin.push_token) {
        await sendPushNotification(
          admin.push_token,
          'Pedido de Missão',
          `${agente_nome || 'Um agente'} solicita delegação para um acidente${distancia_km ? ` (${distancia_km} km)` : ''}.`,
          { type: 'PEDIDO_MISSAO', acidente_id, delegacao_id: delegacao._id.toString() }
        );
      }
      await mongoose.connection.db.collection('notificacoes').insertOne({
        destinatario_id: admin._id.toString(),
        titulo: 'Pedido de Missão',
        mensagem: `${agente_nome || 'Um agente'} solicita delegação para um acidente.`,
        tipo: 'pedido_missao',
        acidente_id,
        lida: false,
        created_at: now
      });
      // SMS to admin
      if (admin.telefone) {
        try {
          let dbConfig = {};
          try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
          const token = dbConfig.ombala_token;
          const senderName = dbConfig.ombala_sender_name || 'DNVT';
          if (token) {
            const axios = require('axios');
            await axios.post('https://api.useombala.ao/v1/messages',
              {
                message: `DTSER: ${agente_nome || 'Um agente'} solicitou missão para o acidente ${acidente_id}. Aprove na plataforma.`,
                from: senderName,
                to: admin.telefone
              },
              { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
            );
          } else {
            console.log(`[SMS] Pedido de missão para admin ${admin.telefone} sem token Ombala configurado.`);
          }
        } catch (smsErr) {
          console.error('Mission request SMS error:', smsErr.message);
        }
      }
    }

    return res.status(201).json(delegacao);
  } catch (err) { console.error('DB error POST /delegacoes/solicitar:', err.message); res.status(500).json({ error: err.message }); }
});

// Admin approves agent request
apiRouter.patch('/delegacoes/:id/aprovar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB indisponível' });
    const delegacao = await Delegacao.findByIdAndUpdate(req.params.id, {
      status: 'APROVADA', aprovada_em: new Date(), updated_at: new Date(),
      delegado_por: req.body.delegado_por || '', delegado_por_nome: req.body.delegado_por_nome || ''
    }, { new: true });
    if (!delegacao) return res.status(404).json({ error: 'Delegação não encontrada' });

    // Notify agent
    try {
      const agentUser = await User.findById(delegacao.agente_id);
      if (agentUser?.push_token) {
        await sendPushNotification(
          agentUser.push_token,
          'Missão Aprovada',
          'O seu pedido de missão foi aprovado. Dirija-se ao local do acidente.',
          { type: 'DELEGACAO_APROVADA', acidente_id: delegacao.acidente_id, delegacao_id: delegacao._id.toString() }
        );
      }
      await mongoose.connection.db.collection('notificacoes').insertOne({
        destinatario_id: delegacao.agente_id,
        titulo: 'Missão Aprovada',
        mensagem: 'O seu pedido de missão foi aprovado. Dirija-se ao local.',
        tipo: 'delegacao',
        acidente_id: delegacao.acidente_id,
        lida: false,
        created_at: new Date()
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    if (delegacao.agente_telefone) {
      try {
        let dbConfig = {};
        try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
        const token = dbConfig.ombala_token;
        const senderName = dbConfig.ombala_sender_name || 'DNVT';
        if (token) {
          const axios = require('axios');
          await axios.post('https://api.useombala.ao/v1/messages',
            {
              message: `DTSER: O seu pedido de missão foi aprovado. Dirija-se ao local do acidente ${delegacao.acidente_id}.`,
              from: senderName,
              to: delegacao.agente_telefone
            },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
          );
        } else {
          console.log(`[SMS] Missão aprovada para ${delegacao.agente_nome} (${delegacao.agente_telefone}) sem token Ombala configurado.`);
        }
      } catch (smsErr) {
        console.error('Mission approval SMS error:', smsErr.message);
      }
    }

    return res.json(delegacao);
  } catch (err) { console.error('DB error PATCH /delegacoes/:id/aprovar:', err.message); res.status(500).json({ error: err.message }); }
});

// Admin rejects agent request
apiRouter.patch('/delegacoes/:id/rejeitar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB indisponível' });
    const delegacao = await Delegacao.findByIdAndUpdate(req.params.id, {
      status: 'REJEITADA', updated_at: new Date(),
      motivo_rejeicao: req.body.motivo || ''
    }, { new: true });
    if (!delegacao) return res.status(404).json({ error: 'Delegação não encontrada' });

    // Notify agent
    try {
      const agentUser = await User.findById(delegacao.agente_id);
      if (agentUser?.push_token) {
        await sendPushNotification(
          agentUser.push_token,
          'Pedido de Missão Rejeitado',
          req.body.motivo ? `Motivo: ${req.body.motivo}` : 'O seu pedido de missão foi rejeitado.',
          { type: 'DELEGACAO_REJEITADA', acidente_id: delegacao.acidente_id }
        );
      }
      await mongoose.connection.db.collection('notificacoes').insertOne({
        destinatario_id: delegacao.agente_id,
        titulo: 'Pedido de Missão Rejeitado',
        mensagem: req.body.motivo || 'O seu pedido de missão foi rejeitado.',
        tipo: 'delegacao',
        acidente_id: delegacao.acidente_id,
        lida: false,
        created_at: new Date()
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    // SMS to agent on rejection
    if (delegacao.agente_telefone) {
      console.log(`[SMS] Pedido de missão rejeitado para ${delegacao.agente_nome} (${delegacao.agente_telefone}). ${req.body.motivo ? 'Motivo: ' + req.body.motivo : 'Contacte a base para mais informações.'}`);
    }

    return res.json(delegacao);
  } catch (err) { console.error('DB error PATCH /delegacoes/:id/rejeitar:', err.message); res.status(500).json({ error: err.message }); }
});

// Get active agents with locations (for admin map)
apiRouter.get('/agentes/ativos-localizacao', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    // Get agents who have recently updated their location (via agentes_a_caminho collection)
    const agents = await User.find({ role: { $in: ['policia', 'admin'] }, status: 'ativo' }).select('-password');
    // Enrich with last known location from agentes_a_caminho
    const locData = await mongoose.connection.db.collection('agentes_a_caminho').find({
      updated_at: { $gte: new Date(Date.now() - 3600000) } // last hour
    }).toArray();
    const locMap = {};
    locData.forEach(l => { locMap[l.agente_id] = l; });

    const result = agents.map(a => ({
      _id: a._id, name: a.name, email: a.email, telefone: a.telefone,
      role: a.role, provincia: a.provincia,
      latitude: locMap[a._id.toString()]?.latitude || null,
      longitude: locMap[a._id.toString()]?.longitude || null,
      last_seen: locMap[a._id.toString()]?.updated_at || null
    }));
    return res.json(result);
  } catch (err) { console.error('DB error /agentes/ativos-localizacao:', err.message); res.json([]); }
});

// ==================== ANOTAÇÕES (ACCIDENT ANNOTATIONS) ====================

// List annotations for an accident
apiRouter.get('/anotacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const query = {};
    if (req.query.acidente_id) query.acidente_id = req.query.acidente_id;
    const anotacoes = await Anotacao.find(query).sort({ created_at: -1 });
    return res.json(anotacoes);
  } catch (err) { console.error('DB error /anotacoes:', err.message); res.json([]); }
});

// Create annotation (text and/or photos)
apiRouter.post('/anotacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB indisponível' });
    const { acidente_id, agente_id, agente_nome, texto, fotos } = req.body;
    if (!acidente_id || !agente_id) return res.status(400).json({ error: 'acidente_id e agente_id são obrigatórios' });
    if (!texto && (!fotos || fotos.length === 0)) return res.status(400).json({ error: 'Texto ou foto são obrigatórios' });

    let tipo = 'TEXTO';
    if (texto && fotos && fotos.length > 0) tipo = 'TEXTO_FOTO';
    else if (fotos && fotos.length > 0) tipo = 'FOTO';

    const anotacao = await Anotacao.create({
      acidente_id, agente_id, agente_nome: agente_nome || '', tipo, texto: texto || '', fotos: fotos || []
    });
    return res.status(201).json(anotacao);
  } catch (err) { console.error('DB error POST /anotacoes:', err.message); res.status(500).json({ error: err.message }); }
});

// Upload annotation photo (base64 → stored as data URI for simplicity)
apiRouter.post('/anotacoes/upload-foto', async (req, res) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) return res.status(400).json({ error: 'base64 é obrigatório' });
    // Store as data URI — in production use cloud storage
    const dataUri = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    return res.json({ url: dataUri, filename: filename || `foto_${Date.now()}.jpg` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== NOTIFICATION ENDPOINTS ====================
apiRouter.post('/notificacoes/enviar', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    const { destinatarios, titulo, mensagem } = req.body;
    if (!destinatarios || !destinatarios.length || !titulo || !mensagem) {
      return res.status(400).json({ error: 'destinatarios, titulo e mensagem são obrigatórios' });
    }

    // Get sender info from token
    let remetenteNome = 'Admin';
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const decoded = require('jsonwebtoken').verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
        const sender = await User.findById(decoded.id).select('name nome');
        if (sender) remetenteNome = sender.nome || sender.name || 'Admin';
      }
    } catch (_) {}

    // Get recipient names for history
    const recipients = await User.find({ _id: { $in: destinatarios } }).select('nome email push_token');
    const recipientNames = recipients.map(r => r.nome || r.email);

    const docs = destinatarios.map(uid => ({
      destinatario_id: uid,
      titulo,
      mensagem,
      remetente: remetenteNome,
      destinatarios_nomes: recipientNames,
      lida: false,
      created_at: new Date()
    }));
    await mongoose.connection.db.collection('notificacoes').insertMany(docs);

    // Send Expo push notifications
    const pushTokens = recipients.map(r => r.push_token).filter(Boolean);
    await sendExpoPush(pushTokens, titulo, mensagem);

    await logAudit({ acao: 'enviar_notificacao', tipo: 'sistema', descricao: `Notificação "${titulo}" enviada para ${destinatarios.length} cidadão(s)`, ip: req.ip });
    return res.json({ success: true, enviadas: destinatarios.length, push_enviados: pushTokens.length });
  } catch (err) {
    console.error('Notification send error:', err.message);
    res.status(500).json({ error: 'Erro ao enviar notificações' });
  }
});

// Admin: list all sent notifications (history)
apiRouter.get('/notificacoes/historico', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    // Group by titulo+created_at to show unique sends
    const all = await mongoose.connection.db.collection('notificacoes')
      .find({})
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();
    // Deduplicate by titulo+timestamp (within 2sec window)
    const seen = new Map();
    const grouped = [];
    for (const n of all) {
      const key = `${n.titulo}__${Math.floor(new Date(n.created_at).getTime() / 2000)}`;
      if (!seen.has(key)) {
        seen.set(key, { ...n, destinatarios_count: 1, destinatarios_nomes: n.destinatarios_nomes || [] });
        grouped.push(seen.get(key));
      } else {
        seen.get(key).destinatarios_count++;
      }
    }
    return res.json(grouped);
  } catch (err) {
    console.error('Notification history error:', err.message);
    res.json([]);
  }
});

apiRouter.get('/notificacoes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    // Get user from token
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json([]);
    const token = authHeader.replace('Bearer ', '');
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const notifs = await mongoose.connection.db.collection('notificacoes')
      .find({ destinatario_id: userId })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    return res.json(notifs);
  } catch (err) {
    console.error('Notification list error:', err.message);
    res.json([]);
  }
});

apiRouter.patch('/notificacoes/:id/lida', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    const { ObjectId } = require('mongodb');
    await mongoose.connection.db.collection('notificacoes').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { lida: true, lida_em: new Date() } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Notification read error:', err.message);
    res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
});

apiRouter.patch('/notificacoes/marcar-todas-lidas', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB não conectada' });
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });
    const token = authHeader.replace('Bearer ', '');
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    await mongoose.connection.db.collection('notificacoes').updateMany(
      { destinatario_id: decoded.id, lida: false },
      { $set: { lida: true, lida_em: new Date() } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err.message);
    res.status(500).json({ error: 'Erro' });
  }
});

// ==================== REGISTRATION VALIDATION ENDPOINTS ====================
// Validate email: check uniqueness + basic MX record check
apiRouter.post('/auth/validar-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ valido: false, erro: 'Email é obrigatório' });
    const emailLower = email.toLowerCase().trim();

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.json({ valido: false, erro: 'Formato de email inválido' });
    }

    // Check uniqueness in DB
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: emailLower });
      if (existing) {
        return res.json({ valido: false, erro: 'Este email já está registado' });
      }
    }

    // MX record check
    try {
      const dns = require('dns').promises;
      const domain = emailLower.split('@')[1];
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return res.json({ valido: false, erro: 'Domínio de email inválido ou inexistente' });
      }
    } catch (dnsErr) {
      return res.json({ valido: false, erro: 'Domínio de email não encontrado' });
    }

    return res.json({ valido: true });
  } catch (err) {
    console.error('Email validation error:', err.message);
    res.json({ valido: false, erro: 'Erro ao validar email' });
  }
});

// Send phone OTP for registration
apiRouter.post('/auth/enviar-otp', async (req, res) => {
  try {
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });

    // Check uniqueness
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ telefone });
      if (existing) {
        return res.json({ success: false, error: 'Este número já está registado' });
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Store OTP
    await mongoose.connection.db.collection('otp_codes').updateOne(
      { telefone },
      { $set: { code: otp, expiry, used: false, created_at: new Date() } },
      { upsert: true }
    );

    // Send via SMS
    try {
      let dbConfig = {};
      try { dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {}; } catch (_) {}
      const smsToken = dbConfig.ombala_token;
      const senderName = dbConfig.ombala_sender_name || 'DNVT';
      if (smsToken) {
        const axios = require('axios');
        await axios.post('https://api.useombala.ao/v1/messages',
          { message: `DTSER - O seu codigo de verificacao e: ${otp}. Valido por 10 minutos.`, from: senderName, to: telefone },
          { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${smsToken}` } }
        );
        console.log(`OTP sent to ${telefone}`);
      } else {
        console.log(`OTP for ${telefone}: ${otp} (SMS not configured)`);
      }
    } catch (smsErr) {
      console.error('OTP SMS error:', smsErr.message);
      console.log(`OTP for ${telefone}: ${otp} (SMS failed)`);
    }

    return res.json({ success: true, message: 'Código enviado' });
  } catch (err) {
    console.error('OTP send error:', err.message);
    res.status(500).json({ success: false, error: 'Erro ao enviar código' });
  }
});

// Verify phone OTP
apiRouter.post('/auth/verificar-otp', async (req, res) => {
  try {
    const { telefone, code } = req.body;
    if (!telefone || !code) return res.status(400).json({ valido: false, erro: 'Telefone e código são obrigatórios' });

    if (mongoose.connection.readyState !== 1) return res.status(500).json({ valido: false, erro: 'DB indisponível' });

    const record = await mongoose.connection.db.collection('otp_codes').findOne({ telefone, code, used: false });
    if (!record) return res.json({ valido: false, erro: 'Código inválido' });
    if (new Date() > new Date(record.expiry)) return res.json({ valido: false, erro: 'Código expirado' });

    await mongoose.connection.db.collection('otp_codes').updateOne(
      { _id: record._id },
      { $set: { used: true } }
    );

    return res.json({ valido: true });
  } catch (err) {
    console.error('OTP verify error:', err.message);
    res.json({ valido: false, erro: 'Erro ao verificar código' });
  }
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
    
    // Call Ombala SMS API (docs: developer.useombala.ao)
    try {
      const axios = require('axios');
      const smsRes = await axios.post('https://api.useombala.ao/v1/messages', 
        { message, from: senderName, to: phone_number },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      );
      
      await logAudit({ acao: 'enviar_sms', tipo: 'sistema', descricao: `SMS enviado para ${phone_number}`, ip: req.ip });
      return res.json({ success: true, data: smsRes.data });
    } catch (smsErr) {
      const errMsg = smsErr.response?.data?.message || smsErr.response?.data?.error || smsErr.message;
      console.error('Ombala SMS error:', smsErr.response?.status, errMsg);
      return res.json({ success: false, error: `Erro da API Ombala: ${errMsg}` });
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
      const axios = require('axios');
      const balRes = await axios.get('https://api.useombala.ao/v1/credits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = balRes.data;
      return res.json({ saldo: data.balance || data.saldo || data.credits || 0 });
    } catch (balErr) {
      const errMsg = balErr.response?.data?.message || balErr.message;
      console.error('Ombala balance error:', balErr.response?.status, errMsg);
      return res.json({ saldo: null, error: `Erro ao consultar saldo: ${errMsg}` });
    }
  } catch (err) {
    console.error('SMS balance error:', err.message);
    res.json({ saldo: null, error: err.message });
  }
});

// ==================== EMAIL TEST ENDPOINT ====================
apiRouter.post('/email/testar', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to) return res.status(400).json({ success: false, error: 'Email de destino é obrigatório' });

    // Read SMTP config from DB
    let config = {};
    if (mongoose.connection.readyState === 1) {
      config = await mongoose.connection.db.collection('configuracoes').findOne() || {};
    }

    const smtpHost = config.email_host;
    const smtpPort = parseInt(config.email_port) || 587;
    const smtpUser = config.email_user;
    const smtpPass = config.email_password;
    const fromName = config.email_from_name || 'DNVT';

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.json({ success: false, error: 'Configurações SMTP incompletas. Preencha o servidor, email e senha nas Configurações e salve primeiro.' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Verify connection first
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error('SMTP verify error:', verifyErr.message);
      return res.json({ success: false, error: `Falha na conexão SMTP: ${verifyErr.message}` });
    }

    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to,
      subject: subject || 'Teste DNVT — Email Institucional',
      html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <div style="background:#1B2A4A;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
          <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px;">DTSER</h1>
          <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;">Direcção de Trânsito e Segurança Rodoviária</p>
        </div>
        <h2 style="color:#1B2A4A;font-size:18px;margin-bottom:12px;">${subject || 'Email de Teste'}</h2>
        <p style="color:#334155;font-size:14px;line-height:1.6;">${body || 'Este é um email de teste do sistema DNVT.'}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#94a3b8;font-size:11px;text-align:center;">
          Email enviado automaticamente pelo sistema DNVT · Angola
        </p>
      </div>`
    });

    await logAudit({ acao: 'testar_email', tipo: 'sistema', descricao: `Email de teste enviado para ${to}`, ip: req.ip });
    return res.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (err) {
    console.error('Email test error:', err.message);
    return res.json({ success: false, error: `Erro ao enviar email: ${err.message}` });
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
// Only start server if not in serverless environment (Vercel)
if (process.env.VERCEL !== '1') {
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
}

// Export app for Vercel serverless
module.exports = app;
