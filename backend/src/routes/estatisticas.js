const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Acidente = require('../models/Acidente');

// Get summary statistics
router.get('/resumo', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const total = await Acidente.countDocuments();
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const acidentes_hoje = await Acidente.countDocuments({
        created_at: { $gte: hoje }
      });

      const acidentes_ativos = await Acidente.countDocuments({
        status: { $in: ['REPORTADO', 'VALIDADO', 'EM_ATENDIMENTO'] }
      });

      const gravidade = {
        grave: await Acidente.countDocuments({ gravidade: 'GRAVE' }),
        moderado: await Acidente.countDocuments({ gravidade: 'MODERADO' }),
        leve: await Acidente.countDocuments({ gravidade: 'LEVE' })
      };

      const status = {
        reportado: await Acidente.countDocuments({ status: 'REPORTADO' }),
        validado: await Acidente.countDocuments({ status: 'VALIDADO' }),
        em_atendimento: await Acidente.countDocuments({ status: 'EM_ATENDIMENTO' }),
        resolvido: await Acidente.countDocuments({ status: 'RESOLVIDO' })
      };

      return res.json({
        total_acidentes: total,
        acidentes_hoje,
        acidentes_ativos,
        gravidade,
        status
      });
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
  }
  res.json({
    total_acidentes: 0,
    acidentes_hoje: 0,
    acidentes_ativos: 0,
    gravidade: { grave: 0, moderado: 0, leve: 0 },
    status: { reportado: 0, validado: 0, em_atendimento: 0, resolvido: 0 }
  });
});

// Get accidents by hour
router.get('/por-hora', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await Acidente.aggregate([
        {
          $group: {
            _id: { $hour: '$created_at' },
            acidentes: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const data = Array.from({ length: 24 }, (_, i) => ({ hora: i, acidentes: 0 }));
      result.forEach(r => {
        data[r._id].acidentes = r.acidentes;
      });

      return res.json(data);
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas por hora:', error);
  }
  res.json(Array.from({ length: 24 }, (_, i) => ({ hora: i, acidentes: 0 })));
});

// Get accidents by day of week
router.get('/por-dia-semana', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await Acidente.aggregate([
        {
          $group: {
            _id: { $dayOfWeek: '$created_at' },
            acidentes: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const data = dias.map(d => ({ dia: d, acidentes: 0 }));
      result.forEach(r => {
        data[r._id - 1].acidentes = r.acidentes;
      });

      return res.json(data);
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas por dia:', error);
  }
  res.json(['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    .map(d => ({ dia: d, acidentes: 0 })));
});

// Get monthly statistics
router.get('/mensal', async (req, res) => {
  try {
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || (new Date().getMonth() + 1);

    if (mongoose.connection.readyState === 1) {
      const startDate = new Date(ano, mes - 1, 1);
      const endDate = new Date(ano, mes, 0, 23, 59, 59);

      const acidentes = await Acidente.find({
        created_at: { $gte: startDate, $lte: endDate }
      });

      return res.json({ ano, mes, total: acidentes.length, acidentes });
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas mensais:', error);
  }
  res.json({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, total: 0, acidentes: [] });
});

module.exports = router;
