@echo off
echo ========================================
echo DNVT - COMMIT DAS MELHORIAS COMPLETAS
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Adicionando arquivos...
git add frontend/src/pages/AcidenteDetalhesPage.js
git add frontend/src/pages/AcidentesPage.js

echo.
echo [2/4] Fazendo commit...
git commit -m "feat: melhorias completas na página de detalhes do acidente

Menu Flutuante Circular (6 botões):
- Reorganizado em círculo perfeito (posições de relógio)
- Cadastrar Boletim (12h - roxo)
- Validar (2h - azul)
- Em Atendimento (4h - laranja)
- Resolver (6h - verde)
- Cancelar (8h - amarelo)
- Remover (10h - vermelho)
- Botões maiores (14x14) com animações suaves

Novo: Cancelar Acidente
- Modal com campo de motivo obrigatório (mín 10 caracteres)
- Checkbox para notificar cidadão
- Validação de entrada
- Status muda para CANCELADO

Confirmações para Todas as Ações:
- Modal de confirmação antes de executar
- Mensagens personalizadas por ação
- Previne ações acidentais

Modal de Histórico:
- Botão 'Ver Histórico' no header
- Timeline visual com ícones coloridos
- Mostra todos os eventos do acidente
- Design moderno com scroll

Tabela de Acidentes:
- Simplificada: apenas 'Ver Detalhes'
- Todas as ações movidas para o menu flutuante

UX/UI:
- Ícones novos: Ban, History, Bell
- Estados adicionados para modais
- Funções: handleCancelarAcidente, confirmAndExecute
- Design consistente e moderno"

echo.
echo [3/4] Fazendo push...
git push origin main

echo.
echo [4/4] Concluído!
echo.
echo ========================================
echo MELHORIAS IMPLEMENTADAS COM SUCESSO!
echo ========================================
echo.
echo Teste agora:
echo 1. Acesse http://localhost:3000/acidentes/[ID]
echo 2. Clique no botão flutuante azul (canto inferior direito)
echo 3. Veja o menu circular com 6 botões
echo 4. Clique em "Ver Histórico" no header
echo 5. Teste cancelar um acidente
echo.
pause
