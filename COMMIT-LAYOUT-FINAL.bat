@echo off
echo ========================================
echo DNVT - COMMIT LAYOUT FINAL DETALHES
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Adicionando arquivos...
git add frontend/src/pages/AcidenteDetalhesPage.js

echo.
echo [2/4] Fazendo commit...
git commit -m "feat: novo layout completo da página de detalhes do acidente

Menu Flutuante Inferior (Centro):
- 3 botões horizontais em barra flutuante
- Informações (azul) - Abre modal com detalhes do acidente
- Boletins (roxo) - Abre modal com lista de boletins
- Delegação (verde) - Abre modal com agentes e delegações
- Design moderno com hover effects e shadow

Menu Flutuante Direita (Ações):
- 6 botões verticais empilhados
- Cadastrar Boletim, Validar, Atendimento, Resolver, Cancelar, Remover
- Todas com confirmações

Modal de Histórico Enriquecido:
- Seção 'Informações de Registro' no topo
- Criado em, Última edição, Origem, Registado por
- Timeline de eventos separada
- Design com gradiente azul

Modal de Informações:
- Tipo, Gravidade, Vítimas, Veículos
- Descrição completa
- Localização com coordenadas
- Reportado por com data

Modal de Boletins:
- Lista completa de boletins
- Cards clicáveis para navegar
- Botão para criar novo boletim
- Empty state quando não há boletins

Modal de Delegação:
- Agentes próximos com distância
- Botão para delegar missão
- Delegações ativas com status
- Design organizado

Mapa Expandido:
- Altura padrão: 500px (antes 256px)
- Altura expandida: 700px (antes 500px)
- Mais espaço para visualização

Card 'Histórico de Registo' Removido:
- Informações movidas para modal
- Página principal mais limpa e focada no mapa

UX/UI:
- Estados: infoModal, boletinsModal, delegacaoModal2
- Ícones: Info, Layers
- Layout responsivo e moderno
- Navegação intuitiva por modais"

echo.
echo [3/4] Fazendo push...
git push origin main

echo.
echo [4/4] Concluído!
echo.
echo ========================================
echo NOVO LAYOUT IMPLEMENTADO COM SUCESSO!
echo ========================================
echo.
echo Teste agora:
echo 1. Acesse http://localhost:3000/acidentes/[ID]
echo 2. Veja o mapa expandido ocupando mais espaço
echo 3. Clique em "Ver Histórico" - veja informações de registro
echo 4. Clique nos botões do menu inferior (centro):
echo    - Informações (azul)
echo    - Boletins (roxo)
echo    - Delegação (verde)
echo 5. Clique no botão flutuante direita para ações
echo.
pause
