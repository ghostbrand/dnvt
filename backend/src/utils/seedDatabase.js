const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Acidente = require('../models/Acidente');
const Boletim = require('../models/Boletim');
const Assistencia = require('../models/Assistencia');
const ZonaCritica = require('../models/ZonaCritica');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB Atlas');

    // ========== ADMIN USER (users collection) ==========
    const existingAdmin = await User.findOne({ email: 'admin@dnvt.com' });
    if (!existingAdmin) {
      await User.create({
        email: 'admin@dnvt.com',
        password: 'admin123',
        name: 'Administrador DNVT',
        role: 'admin',
        telefone: '+244 923 000 001'
      });
      console.log('Admin user created in users: admin@dnvt.com / admin123');
    } else {
      console.log('Admin user already exists in users collection');
    }

    // ========== ACIDENTES (already have 3, add more for variety) ==========
    const acidenteCount = await Acidente.countDocuments();
    console.log(`${acidenteCount} acidentes already exist`);
    if (acidenteCount < 5) {
      const newAcidentes = [
        {
          acidente_id: 'acid_seed_001',
          latitude: -8.8368,
          longitude: 13.2356,
          endereco: 'Largo do Kinaxixe, Luanda',
          descricao: 'Colisão ligeira sem vítimas no cruzamento',
          gravidade: 'LEVE',
          tipo_acidente: 'COLISAO_TRASEIRA',
          causa_principal: 'DESATENCAO',
          numero_vitimas: 0,
          numero_veiculos: 2,
          status: 'RESOLVIDO',
          origem_registro: 'WEB_POLICIA',
          confirmado_oficialmente: true,
          fotos: [],
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
          created_by: 'seed_admin'
        },
        {
          acidente_id: 'acid_seed_002',
          latitude: -8.8510,
          longitude: 13.2890,
          endereco: 'Estrada de Catete, Luanda',
          descricao: 'Acidente com motociclista na via rápida',
          gravidade: 'MODERADO',
          tipo_acidente: 'COLISAO_LATERAL',
          causa_principal: 'ULTRAPASSAGEM_INDEVIDA',
          numero_vitimas: 1,
          numero_veiculos: 2,
          status: 'EM_ATENDIMENTO',
          origem_registro: 'WEB_POLICIA',
          confirmado_oficialmente: true,
          fotos: [],
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
          created_by: 'seed_admin'
        },
        {
          acidente_id: 'acid_seed_003',
          latitude: -8.8295,
          longitude: 13.2450,
          endereco: 'Avenida Deolinda Rodrigues, Luanda',
          descricao: 'Engavetamento de 3 veículos na hora de ponta',
          gravidade: 'GRAVE',
          tipo_acidente: 'COLISAO_FRONTAL',
          causa_principal: 'EXCESSO_VELOCIDADE',
          numero_vitimas: 4,
          numero_veiculos: 3,
          status: 'REPORTADO',
          origem_registro: 'WEB_POLICIA',
          confirmado_oficialmente: false,
          fotos: [],
          created_at: new Date(Date.now() - 30 * 60 * 1000),
          updated_at: new Date(Date.now() - 30 * 60 * 1000),
          created_by: 'seed_admin'
        },
        {
          acidente_id: 'acid_seed_004',
          latitude: -8.8150,
          longitude: 13.2300,
          endereco: 'Marginal de Luanda',
          descricao: 'Despiste de viatura de turismo junto à marginal',
          gravidade: 'LEVE',
          tipo_acidente: 'DESPISTE',
          causa_principal: 'PISO_MOLHADO',
          numero_vitimas: 0,
          numero_veiculos: 1,
          status: 'RESOLVIDO',
          origem_registro: 'WEB_POLICIA',
          confirmado_oficialmente: true,
          fotos: [],
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 11 * 60 * 60 * 1000),
          created_by: 'seed_admin'
        }
      ];
      await Acidente.insertMany(newAcidentes);
      console.log(`${newAcidentes.length} acidentes adicionais criados`);
    }

    // ========== ZONAS CRÍTICAS ==========
    const zonaCount = await ZonaCritica.countDocuments();
    console.log(`${zonaCount} zonas críticas already exist`);
    if (zonaCount < 3) {
      const novasZonas = [
        {
          zona_id: 'zona_seed_001',
          latitude_centro: -8.8383,
          longitude_centro: 13.2344,
          raio_metros: 500,
          nome: 'Avenida 21 de Janeiro - Centro',
          total_acidentes: 15,
          acidentes_graves: 5,
          causa_mais_frequente: 'EXCESSO_VELOCIDADE',
          nivel_risco: 'ALTO',
          recomendacao_melhoria: 'Instalação de semáforos e redutores de velocidade',
          validado: true,
          created_at: new Date()
        },
        {
          zona_id: 'zona_seed_002',
          latitude_centro: -8.8402,
          longitude_centro: 13.2311,
          raio_metros: 300,
          nome: 'Rua Major Kanhangulo',
          total_acidentes: 8,
          acidentes_graves: 2,
          causa_mais_frequente: 'DESATENCAO',
          nivel_risco: 'MEDIO',
          recomendacao_melhoria: 'Melhorar sinalização e iluminação',
          validado: true,
          created_at: new Date()
        },
        {
          zona_id: 'zona_seed_003',
          latitude_centro: -8.8510,
          longitude_centro: 13.2890,
          raio_metros: 600,
          nome: 'Estrada de Catete',
          total_acidentes: 22,
          acidentes_graves: 8,
          causa_mais_frequente: 'EXCESSO_VELOCIDADE',
          nivel_risco: 'ALTO',
          recomendacao_melhoria: 'Fiscalização radar e reforço policial',
          validado: true,
          created_at: new Date()
        }
      ];
      await ZonaCritica.insertMany(novasZonas);
      console.log(`${novasZonas.length} zonas críticas criadas`);
    }

    // ========== ASSISTÊNCIAS ==========
    const assistenciaCount = await Assistencia.countDocuments();
    console.log(`${assistenciaCount} assistências already exist`);

    // ========== BOLETINS ==========
    const boletimCount = await Boletim.countDocuments();
    console.log(`${boletimCount} boletins already exist`);

    console.log('\nSeed completed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    try { await mongoose.connection.close(); } catch(e) {}
    process.exit(1);
  }
}

seedDatabase();
