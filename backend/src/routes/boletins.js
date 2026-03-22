const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Boletim = require('../models/Boletim');
const PDFDocument = require('pdfkit');

// List all boletins
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (req.query.acidente_id) {
        query.acidente_id = req.query.acidente_id;
      }
      const boletins = await Boletim.find(query)
        .populate('acidente_id')
        .sort({ created_at: -1 });
      return res.json(boletins);
    }
  } catch (error) {
    console.error('Erro ao listar boletins:', error);
  }
  res.json([]);
});

// Get boletim by ID
router.get('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = await Boletim.findById(req.params.id).populate('acidente_id');
      if (boletim) return res.json(boletim);
    }
  } catch (error) {
    console.error('Erro ao buscar boletim:', error);
  }
  res.status(404).json({ detail: 'Boletim não encontrado' });
});

// Create boletim
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = new Boletim(req.body);
      await boletim.save();
      return res.status(201).json(boletim);
    }
  } catch (error) {
    console.error('Erro ao criar boletim:', error);
  }
  res.status(500).json({ detail: 'Erro ao criar boletim' });
});

// Update boletim
router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = await Boletim.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).populate('acidente_id');
      if (boletim) return res.json(boletim);
    }
  } catch (error) {
    console.error('Erro ao atualizar boletim:', error);
  }
  res.status(404).json({ detail: 'Boletim não encontrado' });
});

// Delete boletim
router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const boletim = await Boletim.findByIdAndDelete(req.params.id);
      if (boletim) return res.json({ message: 'Boletim removido com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao deletar boletim:', error);
  }
  res.status(404).json({ detail: 'Boletim não encontrado' });
});

// Generate PDF for boletim
router.get('/:id/pdf', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ detail: 'Banco de dados não conectado' });
    }

    const boletim = await Boletim.findById(req.params.id).populate('acidente_id');
    
    if (!boletim) {
      return res.status(404).json({ detail: 'Boletim não encontrado' });
    }

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=boletim_${boletim.numero_processo || boletim._id}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to add section
    const addSection = (title, y) => {
      doc.fontSize(14).font('Helvetica-Bold').text(title, 50, y);
      doc.moveTo(50, y + 20).lineTo(545, y + 20).stroke();
      return y + 30;
    };

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('BOLETIM DE OCORRÊNCIA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text('Direcção Nacional de Viação e Trânsito', { align: 'center' });
    doc.moveDown(2);

    let yPosition = 150;

    // Informações Gerais
    yPosition = addSection('INFORMAÇÕES GERAIS', yPosition);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Número do Processo: ${boletim.numero_processo || 'N/A'}`, 50, yPosition);
    yPosition += 20;
    doc.text(`Data de Criação: ${boletim.created_at ? new Date(boletim.created_at).toLocaleString('pt-AO') : 'N/A'}`, 50, yPosition);
    yPosition += 20;
    doc.text(`Modo de Criação: ${boletim.modo_criacao || 'GERADO_SISTEMA'}`, 50, yPosition);
    yPosition += 20;
    if (boletim.created_by) {
      doc.text(`Registado por: ${boletim.created_by}`, 50, yPosition);
      yPosition += 20;
    }
    yPosition += 10;

    // Acidente Relacionado
    if (boletim.acidente_id) {
      yPosition = addSection('ACIDENTE RELACIONADO', yPosition);
      const acidente = boletim.acidente_id;
      if (typeof acidente === 'object') {
        doc.text(`Tipo: ${acidente.tipo_acidente || 'N/A'}`, 50, yPosition);
        yPosition += 20;
        doc.text(`Localização: ${acidente.localizacao || 'N/A'}`, 50, yPosition);
        yPosition += 20;
        doc.text(`Gravidade: ${acidente.gravidade || 'N/A'}`, 50, yPosition);
        yPosition += 20;
      } else {
        doc.text(`ID do Acidente: ${acidente}`, 50, yPosition);
        yPosition += 20;
      }
      yPosition += 10;
    }

    // Observações
    if (boletim.observacoes) {
      yPosition = addSection('OBSERVAÇÕES', yPosition);
      const lines = doc.heightOfString(boletim.observacoes, { width: 495 });
      if (yPosition + lines > 750) {
        doc.addPage();
        yPosition = 50;
      }
      doc.text(boletim.observacoes, 50, yPosition, { width: 495, align: 'justify' });
      yPosition += lines + 20;
    }

    // Vítimas
    if (boletim.vitimas_info && boletim.vitimas_info.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      yPosition = addSection(`VÍTIMAS (${boletim.vitimas_info.length})`, yPosition);
      
      boletim.vitimas_info.forEach((vitima, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        doc.font('Helvetica-Bold').text(`Vítima ${index + 1}:`, 50, yPosition);
        yPosition += 15;
        doc.font('Helvetica');
        if (vitima.nome) {
          doc.text(`Nome: ${vitima.nome}`, 60, yPosition);
          yPosition += 15;
        }
        if (vitima.bi) {
          doc.text(`BI: ${vitima.bi}`, 60, yPosition);
          yPosition += 15;
        }
        if (vitima.estado) {
          doc.text(`Estado: ${vitima.estado.replace(/_/g, ' ')}`, 60, yPosition);
          yPosition += 15;
        }
        if (vitima.telefone) {
          doc.text(`Telefone: ${vitima.telefone}`, 60, yPosition);
          yPosition += 15;
        }
        if (vitima.endereco) {
          doc.text(`Endereço: ${vitima.endereco}`, 60, yPosition);
          yPosition += 15;
        }
        yPosition += 10;
      });
    }

    // Veículos
    if (boletim.veiculos_info && boletim.veiculos_info.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      yPosition = addSection(`VEÍCULOS (${boletim.veiculos_info.length})`, yPosition);
      
      boletim.veiculos_info.forEach((veiculo, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        doc.font('Helvetica-Bold').text(`Veículo ${index + 1}:`, 50, yPosition);
        yPosition += 15;
        doc.font('Helvetica');
        if (veiculo.marca || veiculo.modelo) {
          doc.text(`Marca/Modelo: ${veiculo.marca || ''} ${veiculo.modelo || ''}`, 60, yPosition);
          yPosition += 15;
        }
        if (veiculo.matricula) {
          doc.text(`Matrícula: ${veiculo.matricula}`, 60, yPosition);
          yPosition += 15;
        }
        if (veiculo.cor) {
          doc.text(`Cor: ${veiculo.cor}`, 60, yPosition);
          yPosition += 15;
        }
        if (veiculo.proprietario) {
          doc.text(`Proprietário: ${veiculo.proprietario}`, 60, yPosition);
          yPosition += 15;
        }
        yPosition += 10;
      });
    }

    // Testemunhas
    if (boletim.testemunhas && boletim.testemunhas.length > 0) {
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      yPosition = addSection(`TESTEMUNHAS (${boletim.testemunhas.length})`, yPosition);
      
      boletim.testemunhas.forEach((testemunha, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        doc.font('Helvetica-Bold').text(`Testemunha ${index + 1}:`, 50, yPosition);
        yPosition += 15;
        doc.font('Helvetica');
        if (testemunha.nome) {
          doc.text(`Nome: ${testemunha.nome}`, 60, yPosition);
          yPosition += 15;
        }
        if (testemunha.telefone) {
          doc.text(`Telefone: ${testemunha.telefone}`, 60, yPosition);
          yPosition += 15;
        }
        if (testemunha.endereco) {
          doc.text(`Endereço: ${testemunha.endereco}`, 60, yPosition);
          yPosition += 15;
        }
        yPosition += 10;
      });
    }

    // Footer
    const now = new Date();
    const formattedDate = now.toLocaleString('pt-PT', { 
      timeZone: 'Africa/Luanda',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').text(
        `Página ${i + 1} de ${pageCount} - Gerado em ${formattedDate}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ detail: 'Erro ao gerar PDF', error: error.message });
    }
  }
});

module.exports = router;
