const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const User = require('../models/User');

// Login
router.post('/login', login);

// Get current user
router.get('/me', getMe);

// Register
router.post('/register', register);

// Password recovery - Step 1: Send code via email
router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email é obrigatório' });

    const mongoose = require('mongoose');
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ detail: 'Utilizador não encontrado' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_code = code;
    user.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Get email configuration from database
    let config = {};
    if (mongoose.connection.readyState === 1) {
      config = await mongoose.connection.db.collection('configuracoes').findOne() || {};
    }

    const emailHost = config.email_host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(config.email_port || process.env.SMTP_PORT || '587');
    const emailUser = config.email_user || process.env.SMTP_USER;
    const emailPass = config.email_password || process.env.SMTP_PASS;
    const emailFromName = config.email_from_name || 'DNVT - Sistema de Gestão';

    if (!emailUser || !emailPass) {
      console.error('Email configuration missing');
      return res.status(500).json({ detail: 'Configuração de email não encontrada. Configure nas Configurações do sistema.' });
    }

    const nodemailer = require('nodemailer');
    const isSecure = emailPort === 465;
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: isSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: `"${emailFromName}" <${emailUser}>`,
      to: email,
      subject: 'Código de Recuperação de Senha - DNVT',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Olá ${user.name},</p>
        <p>Seu código de recuperação é: <strong>${code}</strong></p>
        <p>Este código expira em 15 minutos.</p>
        <p>Se você não solicitou esta recuperação, ignore este email.</p>
      `,
    });

    res.json({ message: 'Código enviado para o email' });
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    res.status(500).json({ detail: 'Erro ao enviar código de recuperação' });
  }
});

// Password recovery - Step 2: Verify code and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, nova_senha } = req.body;
    if (!email || !code || !nova_senha) {
      return res.status(400).json({ detail: 'Email, código e nova senha são obrigatórios' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ detail: 'Utilizador não encontrado' });

    if (!user.reset_code || user.reset_code !== code) {
      return res.status(400).json({ detail: 'Código inválido' });
    }

    if (user.reset_code_expires < new Date()) {
      return res.status(400).json({ detail: 'Código expirado' });
    }

    const bcrypt = require('bcryptjs');
    user.password = await bcrypt.hash(nova_senha, 10);
    user.reset_code = undefined;
    user.reset_code_expires = undefined;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ detail: 'Erro ao resetar senha' });
  }
});

// Register push token
router.post('/push-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const { push_token } = req.body;
    if (!push_token) {
      return res.status(400).json({ error: 'push_token é obrigatório' });
    }
    
    await User.findByIdAndUpdate(decoded.userId || decoded.id, { push_token });
    return res.json({ success: true });
  } catch (error) {
    console.error('Push token error:', error);
    res.status(500).json({ error: 'Erro ao registar push token' });
  }
});

// Validate email for registration
router.post('/validar-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ valido: false, erro: 'Email é obrigatório' });
    const emailLower = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.json({ valido: false, erro: 'Formato de email inválido' });
    }

    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: emailLower });
      if (existing) {
        return res.json({ valido: false, erro: 'Este email já está registado' });
      }
    }

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
  } catch (error) {
    console.error('Email validation error:', error.message);
    res.json({ valido: false, erro: 'Erro ao validar email' });
  }
});

// Send phone OTP for registration
router.post('/enviar-otp', async (req, res) => {
  try {
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });

    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ telefone });
      if (existing) {
        return res.json({ success: false, error: 'Este número já está registado' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await mongoose.connection.db.collection('otp_codes').updateOne(
      { telefone },
      { $set: { code: otp, expiry, used: false, created_at: new Date() } },
      { upsert: true }
    );

    try {
      let dbConfig = {};
      if (mongoose.connection.readyState === 1) {
        dbConfig = await mongoose.connection.db.collection('configuracoes').findOne() || {};
      }
      const smsToken = dbConfig.ombala_token;
      const senderName = dbConfig.ombala_sender_name || 'DNVT';
      if (smsToken) {
        const axios = require('axios');
        await axios.post('https://api.useombala.ao/v1/messages',
          { message: `DNVT - O seu codigo de verificacao e: ${otp}. Valido por 10 minutos.`, from: senderName, to: telefone },
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
  } catch (error) {
    console.error('OTP send error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao enviar código' });
  }
});

// Verify phone OTP
router.post('/verificar-otp', async (req, res) => {
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
  } catch (error) {
    console.error('OTP verify error:', error.message);
    res.status(500).json({ valido: false, erro: 'Erro ao verificar código' });
  }
});

module.exports = router;
