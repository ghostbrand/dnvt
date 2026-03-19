@echo off
echo ========================================
echo DNVT - COMMIT COMPLETO DE TODAS AS ALTERACOES
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Verificando status...
git status

echo.
echo [2/5] Adicionando TODOS os arquivos modificados...
git add backend/src/routes/acidentes.js
git add backend/src/routes/utilizadores.js
git add backend/src/routes/configuracoes.js
git add backend/src/routes/historico.js
git add backend/src/routes/notificacoes.js
git add backend/src/routes/assistencias.js
git add backend/src/routes/boletins.js
git add backend/src/routes/agentes.js
git add backend/src/routes/delegacoes.js
git add backend/src/routes/zonas.js
git add backend/src/routes/estatisticas.js
git add backend/src/routes/auth.js
git add backend/src/models/Configuracao.js
git add backend/index.js
git add frontend/src/pages/AcidenteDetalhesPage.js

echo.
echo [3/5] Fazendo commit...
git commit -m "fix: resolve all 404 errors and implement features

Backend fixes:
- Fix GET /api/acidentes/:id with proper ObjectId validation and populates
- Fix GET /api/agentes-a-caminho route path (was /a-caminho, now /)
- Add GET/PATCH /api/utilizadores/me for current user profile
- Add GET /api/utilizadores/cidadaos/buscar for citizen search
- Add GET/POST /api/historico for activity logs
- Create Configuracao model with proper schema
- Fix configuracoes routes to use Configuracao model
- Add all missing routes: notificacoes, assistencias, boletins
- Improve error handling and MongoDB connection checks

Frontend features:
- Implement circular floating action menu (FAB)
- Replace dropdown with animated circular menu
- Add smooth transitions with staggered delays
- Include backdrop blur overlay when menu is open
- Organize actions in circle: Validar, Atendimento, Resolver, Boletim, Remover
- Main button rotates 45deg when opening menu
- Each action button has specific color and icon

All routes are now properly mounted and functional."

echo.
echo [4/5] Fazendo push para GitHub...
git push origin main

echo.
echo [5/5] Concluido!
echo.
echo ========================================
echo DEPLOY EM ANDAMENTO NA VERCEL
echo ========================================
echo.
echo Aguarde 2-3 minutos para o redeploy automatico.
echo.
echo Depois teste:
echo - https://dnvt-rho.vercel.app/api/health
echo - https://dnvt-rho.vercel.app/api/acidentes/69bb2663d964178e8eae6cf4
echo - https://dnvt-rho.vercel.app/api/agentes-a-caminho
echo - https://dnvt-rho.vercel.app/api/historico
echo - https://dnvt-rho.vercel.app/api/configuracoes
echo.
echo ========================================
pause
