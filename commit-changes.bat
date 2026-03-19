@echo off
echo ========================================
echo DNVT - Commit e Push das Alteracoes
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Adicionando arquivos do backend...
git add backend/src/routes/acidentes.js
git add backend/src/routes/utilizadores.js
git add backend/src/routes/configuracoes.js
git add backend/src/routes/historico.js
git add backend/src/routes/notificacoes.js
git add backend/src/routes/assistencias.js
git add backend/src/routes/boletins.js
git add backend/src/routes/agentes.js
git add backend/src/models/Configuracao.js
git add backend/index.js

echo [2/4] Adicionando arquivos do frontend...
git add frontend/src/pages/AcidenteDetalhesPage.js

echo [3/4] Fazendo commit...
git commit -m "feat: fix routes and implement circular floating menu

Backend:
- Fix GET /api/acidentes/:id with better ObjectId validation
- Add populate for zona_critica and user fields
- Add /api/utilizadores/me (GET/PATCH)
- Add /api/utilizadores/cidadaos/buscar
- Add /api/historico routes (GET/POST)
- Create Configuracao model
- Fix configuracoes routes to use model

Frontend:
- Implement circular floating action menu
- Replace dropdown with animated circular menu
- Add smooth transitions with delays
- Include backdrop blur overlay
- Organize actions: Validar, Atendimento, Resolver, Boletim, Remover"

echo [4/4] Fazendo push para GitHub...
git push origin main

echo.
echo ========================================
echo Concluido! Aguarde 2-3 minutos para o redeploy da Vercel
echo ========================================
echo.
pause
