# 🚀 Instruções de Deploy - DNVT na Vercel

## 📦 Estrutura do Projeto
- **Frontend**: Painel Admin (React + Create React App)
- **Backend**: API REST (Node.js + Express + MongoDB)
- **Mobile**: App React Native (aponta para o backend em produção)

---

## ✅ Passo a Passo para Deploy

### 1️⃣ Fazer Commit das Configurações

```bash
git add .
git commit -m "chore: configure vercel deployment"
git push origin main
```

### 2️⃣ Configurar Projeto na Vercel

1. Acede a https://vercel.com
2. Faz login com GitHub
3. Clica em **"Add New Project"**
4. Importa o repositório **`dnvt`**

### 3️⃣ Configurações do Projeto

**Framework Preset**: `Other`
**Root Directory**: `.` (deixar vazio - raiz do projeto)
**Build Command**: (deixar vazio - usa vercel.json)
**Output Directory**: (deixar vazio - usa vercel.json)
**Install Command**: `npm install`

### 4️⃣ Variáveis de Ambiente (IMPORTANTE!)

Adiciona estas variáveis na secção **Environment Variables**:

```env
# Backend - MongoDB
MONGO_URL=mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm

# Backend - JWT
JWT_SECRET=dnvt_super_secret_key_2024_angola_traffic_system
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24

# Backend - CORS (atualizar depois do deploy)
CORS_ORIGINS=*

# Backend - Port
PORT=3333

# Frontend - API URL (atualizar depois do deploy)
REACT_APP_API_URL=/api
```

### 5️⃣ Fazer Deploy

Clica em **"Deploy"** e aguarda o build completar.

---

## 🔧 Após o Primeiro Deploy

### Atualizar CORS

1. Copia o URL do teu projeto (ex: `https://dnvt.vercel.app`)
2. Vai para **Settings** → **Environment Variables**
3. Edita `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://dnvt.vercel.app
   ```
4. Faz **Redeploy**

### Atualizar Mobile App

No ficheiro `mobile/src/services/api.js`:

```javascript
const API_URL = __DEV__ 
  ? 'http://localhost:3333/api'
  : 'https://dnvt.vercel.app/api';
```

---

## 🗂️ Como Funciona

### Rotas na Vercel:
- **`/api/*`** → Backend (Node.js)
- **`/*`** → Frontend (React Admin)

### Exemplo:
- `https://dnvt.vercel.app/` → Painel Admin
- `https://dnvt.vercel.app/api/auth/login` → API Backend
- `https://dnvt.vercel.app/api/acidentes` → API Backend

---

## 🔐 MongoDB Atlas

Certifica-te que o MongoDB Atlas aceita conexões da Vercel:

1. Acede ao MongoDB Atlas
2. **Network Access** → **Add IP Address**
3. Adiciona: `0.0.0.0/0` (permite todos os IPs)
   - Ou adiciona IPs específicos da Vercel para mais segurança

---

## 🐛 Troubleshooting

### Erro: "Build failed"
- Verifica os logs completos na Vercel
- Confirma que `package.json` tem todas as dependências
- Testa localmente: `npm run build` (frontend) e `npm start` (backend)

### Erro: "Cannot connect to MongoDB"
- Verifica se `MONGO_URL` está nas variáveis de ambiente
- Confirma que MongoDB Atlas permite IP `0.0.0.0/0`
- Testa a conexão localmente primeiro

### Erro: "CORS blocked"
- Atualiza `CORS_ORIGINS` com o domínio correto
- Faz redeploy após mudar variáveis de ambiente

### Frontend não carrega
- Verifica se o build do frontend completou com sucesso
- Confirma que `craco` está instalado nas dependências
- Verifica logs de build do frontend

### Backend não responde
- Testa: `https://teu-projeto.vercel.app/api/health`
- Verifica variáveis de ambiente (MongoDB, JWT)
- Confirma que `backend/server.js` existe

---

## 📱 Mobile App

Depois do deploy:

1. Atualiza `API_URL` no mobile para apontar para produção
2. Testa login e funcionalidades
3. Publica nova versão do app

---

## ✅ Checklist Final

- [ ] Commit e push das configurações
- [ ] Deploy na Vercel completado
- [ ] Variáveis de ambiente configuradas
- [ ] MongoDB Atlas permite conexões
- [ ] CORS atualizado com domínio correto
- [ ] Frontend carrega: `https://teu-projeto.vercel.app`
- [ ] Backend responde: `https://teu-projeto.vercel.app/api/health`
- [ ] Mobile app atualizado para produção

---

**Boa sorte! 🚀**
