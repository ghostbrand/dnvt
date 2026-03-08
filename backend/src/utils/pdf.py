from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY


def generate_boletim_pdf(boletim: dict, acidente: dict, user: dict) -> BytesIO:
    """Generate PDF for Boletim de Ocorrência"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='TitleCenter', parent=styles['Title'], alignment=TA_CENTER, fontSize=16, spaceAfter=20))
    styles.add(ParagraphStyle(name='SubTitle', parent=styles['Normal'], fontSize=12, spaceAfter=10, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='BodyTextCustom', parent=styles['Normal'], fontSize=10, alignment=TA_JUSTIFY, spaceAfter=8))
    styles.add(ParagraphStyle(name='SmallText', parent=styles['Normal'], fontSize=8, textColor=colors.gray))
    
    elements = []
    
    # Header
    elements.append(Paragraph("REPÚBLICA DE ANGOLA", styles['TitleCenter']))
    elements.append(Paragraph("DIREÇÃO NACIONAL DE VIAÇÃO E TRÂNSITO", styles['TitleCenter']))
    elements.append(Paragraph("BOLETIM DE OCORRÊNCIA", styles['TitleCenter']))
    elements.append(Spacer(1, 20))
    
    # Process number
    elements.append(Paragraph(f"<b>Nº Processo:</b> {boletim.get('numero_processo', 'N/A')}", styles['SubTitle']))
    elements.append(Spacer(1, 15))
    
    # Accident info
    elements.append(Paragraph("DADOS DO ACIDENTE", styles['SubTitle']))
    
    created_at = acidente.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    acidente_data = [
        ["Data/Hora:", created_at.strftime('%d/%m/%Y %H:%M') if created_at else 'N/A'],
        ["Tipo:", str(acidente.get('tipo_acidente', 'N/A')).replace('_', ' ')],
        ["Gravidade:", str(acidente.get('gravidade', 'N/A'))],
        ["Coordenadas:", f"{acidente.get('latitude', 0):.6f}, {acidente.get('longitude', 0):.6f}"],
        ["Endereço:", acidente.get('endereco', 'N/A') or 'N/A'],
        ["Causa Principal:", str(acidente.get('causa_principal', 'N/A')).replace('_', ' ') if acidente.get('causa_principal') else 'N/A'],
        ["Nº Veículos:", str(acidente.get('numero_veiculos', 0))],
        ["Nº Vítimas:", str(acidente.get('numero_vitimas', 0))],
    ]
    
    table = Table(acidente_data, colWidths=[4*cm, 12*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.95, 0.95, 0.95)),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    # Description
    elements.append(Paragraph("DESCRIÇÃO DO ACIDENTE", styles['SubTitle']))
    elements.append(Paragraph(acidente.get('descricao', 'Sem descrição'), styles['BodyTextCustom']))
    elements.append(Spacer(1, 15))
    
    # Victims info if available
    vitimas = boletim.get('vitimas_info', [])
    if vitimas:
        elements.append(Paragraph("INFORMAÇÕES DAS VÍTIMAS", styles['SubTitle']))
        for i, vitima in enumerate(vitimas, 1):
            elements.append(Paragraph(f"{i}. {vitima.get('nome', 'N/A')} - {vitima.get('estado', 'N/A')}", styles['BodyTextCustom']))
        elements.append(Spacer(1, 15))
    
    # Vehicles info if available
    veiculos = boletim.get('veiculos_info', [])
    if veiculos:
        elements.append(Paragraph("INFORMAÇÕES DOS VEÍCULOS", styles['SubTitle']))
        for i, veiculo in enumerate(veiculos, 1):
            elements.append(Paragraph(f"{i}. {veiculo.get('marca', 'N/A')} - Matrícula: {veiculo.get('matricula', 'N/A')}", styles['BodyTextCustom']))
        elements.append(Spacer(1, 15))
    
    # Observations
    if boletim.get('observacoes'):
        elements.append(Paragraph("OBSERVAÇÕES", styles['SubTitle']))
        elements.append(Paragraph(boletim.get('observacoes', ''), styles['BodyTextCustom']))
        elements.append(Spacer(1, 15))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(f"Documento gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['SmallText']))
    elements.append(Paragraph(f"Responsável: {user.get('nome', 'N/A')}", styles['SmallText']))
    elements.append(Paragraph(f"ID do Boletim: {boletim.get('boletim_id', 'N/A')}", styles['SmallText']))
    
    # Signature area
    elements.append(Spacer(1, 40))
    sig_data = [
        ["_" * 40, "_" * 40],
        ["Agente Responsável", "Testemunha"],
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, 1), 5),
    ]))
    elements.append(sig_table)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
