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

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ detail: 'Utilizador não encontrado' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_code = code;
    user.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
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

module.exports = router;
