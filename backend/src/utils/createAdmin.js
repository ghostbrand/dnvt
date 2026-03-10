const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Verificar se admin já existe
    const existingAdmin = await User.findOne({ email: 'admin@dnvt.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Criar usuário admin
    const admin = new User({
      email: 'admin@dnvt.com',
      password: 'admin123',
      name: 'Administrador DNVT',
      role: 'admin',
      nivel_acesso: 'total',
      status: 'ativo',
      privilegios: {
        gestao_acidentes: true,
        gestao_boletins: true,
        gestao_zonas: true,
        gestao_assistencias: true,
        gestao_utilizadores: true,
        ver_estatisticas: true,
        configuracoes: true,
        exportar_dados: true
      }
    });
    
    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@dnvt.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();
