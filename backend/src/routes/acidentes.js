const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Acidente = require('../models/Acidente');
const User = require('../models/User');
const ZonaCritica = require('../models/ZonaCritica');

// Get agent urgencies (accidents in monitored zones)
router.get('/urgencias', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    
    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json([]);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.zonas_notificacao?.length) return res.json([]);

    const zoneIds = user.zonas_notificacao;
    const acidentes = await Acidente.find({
      zona_critica: { $in: zoneIds },
      status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] }
    })
      .sort({ created_at: -1 });

    res.json(acidentes);
  } catch (error) {
    console.error('Erro ao buscar urgências:', error);
    res.json([]);
  }
});

// Get active accidents
router.get('/ativos', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const acidentes = await Acidente.find({
        status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] }
      }).sort({ created_at: -1 });
      return res.json(acidentes);
    }
  } catch (error) {
    console.error('Erro ao buscar acidentes ativos:', error);
  }
  res.json([]);
});

// Get accident by ID
router.get('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const id = req.params.id;
      let acidente = null;
      
      // Try to find by MongoDB _id
      if (mongoose.Types.ObjectId.isValid(id)) {
        acidente = await Acidente.findById(id);
      }
      
      // If not found, try by acidente_id field
      if (!acidente) {
        acidente = await Acidente.findOne({ acidente_id: id });
      }
      
      if (acidente) return res.json(acidente);
    }
  } catch (error) {
    console.error('Erro ao buscar acidente:', error);
  }
  res.status(404).json({ detail: 'Acidente não encontrado' });
});

// List all accidents
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    if (mongoose.connection.readyState === 1) {
      const acidentes = await Acidente.find().sort({ created_at: -1 }).limit(limit);
      return res.json(acidentes);
    }
  } catch (error) {
    console.error('Erro ao listar acidentes:', error);
  }
  res.json([]);
});

// Create accident
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const data = { ...req.body };

      // Find closest critical zone
      if (data.latitude && data.longitude) {
        const zonas = await ZonaCritica.find();
        let closestZone = null;
        let minDistance = Infinity;

        for (const zona of zonas) {
          const distance = Math.sqrt(
            Math.pow(zona.latitude - data.latitude, 2) +
            Math.pow(zona.longitude - data.longitude, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestZone = zona;
          }
        }

        if (closestZone && minDistance < 0.05) {
          data.zona_critica = closestZone._id;
        }
      }

      const acidente = new Acidente(data);
      await acidente.save();

      // Send push notifications to agents monitoring the zone
      if (data.zona_critica) {
        const agentes = await User.find({
          role: 'AGENTE',
          zonas_monitoradas: data.zona_critica,
          push_token: { $exists: true, $ne: null }
        });

        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();

        for (const agente of agentes) {
          if (Expo.isExpoPushToken(agente.push_token)) {
            try {
              await expo.sendPushNotificationsAsync([{
                to: agente.push_token,
                sound: 'default',
                title: '🚨 Novo Acidente na Sua Zona',
                body: `${data.tipo || 'Acidente'} reportado em ${data.localizacao || 'zona monitorada'}`,
                data: { acidenteId: acidente._id.toString(), tipo: 'novo_acidente' }
              }]);
            } catch (error) {
              console.error('Erro ao enviar notificação:', error);
            }
          }
        }
      }

      return res.status(201).json(acidente);
    }
  } catch (error) {
    console.error('Erro ao criar acidente:', error);
  }
  res.status(500).json({ detail: 'Erro ao criar acidente' });
});

// Update accident
router.patch('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const jwt = require('jsonwebtoken');
      const token = req.headers.authorization?.split(' ')[1];
      let operatorName = 'Sistema';

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId);
          if (user) operatorName = user.name;
        } catch (error) {
          console.error('Token inválido:', error);
        }
      }

      const acidente = await Acidente.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updated_by: operatorName },
        { new: true }
      );

      if (acidente) return res.json(acidente);
    }
  } catch (error) {
    console.error('Erro ao atualizar acidente:', error);
  }
  res.status(500).json({ detail: 'Erro ao atualizar acidente' });
});

// Delete accident
router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const Boletim = require('../models/Boletim');
      
      // Delete associated boletins first
      await Boletim.deleteMany({ acidente_id: req.params.id });
      
      const acidente = await Acidente.findByIdAndDelete(req.params.id);
      if (acidente) return res.json({ message: 'Acidente deletado' });
    }
  } catch (error) {
    console.error('Erro ao deletar acidente:', error);
  }
  res.status(404).json({ detail: 'Acidente não encontrado' });
});

// Agent confirms heading to accident
router.post('/:id/confirmar-ida', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }

    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

    const acidente = await Acidente.findById(req.params.id);
    if (!acidente) return res.status(404).json({ error: 'Acidente não encontrado' });

    const col = mongoose.connection.db.collection('agent_tracking');
    await col.updateOne(
      { agent_id: user._id.toString(), acidente_id: req.params.id },
      {
        $set: {
          agent_id: user._id.toString(),
          agent_name: user.name,
          acidente_id: req.params.id,
          status: 'a_caminho',
          started_at: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ message: 'Confirmação registrada', agent: user.name });
  } catch (error) {
    console.error('Erro ao confirmar ida:', error);
    res.status(500).json({ error: 'Erro ao confirmar ida' });
  }
});

// Agent sends live location update
router.patch('/:id/agent-location', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'DB não conectada' });
    }

    const jwt = require('jsonwebtoken');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude obrigatórias' });
    }

    const col = mongoose.connection.db.collection('agent_tracking');
    await col.updateOne(
      { agent_id: decoded.userId, acidente_id: req.params.id },
      {
        $set: {
          latitude,
          longitude,
          last_update: new Date()
        }
      }
    );

    res.json({ message: 'Localização atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar localização:', error);
    res.status(500).json({ error: 'Erro ao atualizar localização' });
  }
});

// Get agents heading to accident
router.get('/:id/agentes-a-caminho', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    
    const col = mongoose.connection.db.collection('agent_tracking');
    const agents = await col.find({ acidente_id: req.params.id }).toArray();
    res.json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    res.json([]);
  }
});

module.exports = router;
