# 🚀 Setup Vercel - DNVT

## ⚠️ IMPORTANTE: Deploy em 2 Projetos Separados

A melhor abordagem é fazer **2 projetos separados** na Vercel:

---

## 📦 Projeto 1: Frontend (Admin Panel)

### 1. Criar Novo Projeto na Vercel
1. Vai para https://vercel.com/new
2. Importa o repositório `ghostbrand/dnvt`
3. **Nome do projeto**: `dnvt-admin` (ou outro nome)

### 2. Configurações do Projeto

**Framework Preset**: `Create React App`

**Root Directory**: `frontend`

**Build Command**: 
```bash
npm install --legacy-peer-deps && npm run build
```

**Output Directory**: `build`

**Install Command**:
```bash
npm install --legacy-peer-deps
```

### 3. Environment Variables

Adiciona estas variáveis:
```env
DISABLE_ESLINT_PLUGIN=true
REACT_APP_API_URL=https://dnvt-api.vercel.app/api
```

⚠️ **Nota**: Muda `REACT_APP_API_URL` depois de fazer deploy do backend (Projeto 2)

### 4. Deploy
Clica em **"Deploy"** e aguarda.

**URL esperado**: `https://dnvt-admin.vercel.app`

---

## 🔧 Projeto 2: Backend (API)

### 1. Criar Novo Projeto na Vercel
1. Vai para https://vercel.com/new
2. Importa o **mesmo repositório** `ghostbrand/dnvt`
3. **Nome do projeto**: `dnvt-api` (ou outro nome)

### 2. Configurações do Projeto

**Framework Preset**: `Other`

**Root Directory**: `backend`

**Build Command**: (deixar vazio)

**Output Directory**: (deixar vazio)

**Install Command**:
```bash
npm install
```

### 3. Environment Variables

Adiciona estas variáveis:
```env
MONGO_URL=mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm
CORS_ORIGINS=https://dnvt-admin.vercel.app
JWT_SECRET=dnvt_super_secret_key_2024_angola_traffic_system
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
PORT=3333
```

⚠️ **Nota**: Muda `CORS_ORIGINS` para o URL real do frontend (Projeto 1)

### 4. Criar Ficheiro `vercel.json` na pasta `backend/`

Cria o ficheiro `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### 5. Deploy
Clica em **"Deploy"** e aguarda.

**URL esperado**: `https://dnvt-api.vercel.app`

---

## 🔄 Atualizar Configurações Após Deploy

### 1. Atualizar Frontend
Vai para o **Projeto 1** (Frontend):
- **Settings** → **Environment Variables**
- Edita `REACT_APP_API_URL`:
  ```
  REACT_APP_API_URL=https://dnvt-api.vercel.app/api
  ```
- Clica em **"Redeploy"**

### 2. Atualizar Backend
Vai para o **Projeto 2** (Backend):
- **Settings** → **Environment Variables**
- Edita `CORS_ORIGINS`:
  ```
  CORS_ORIGINS=https://dnvt-admin.vercel.app
  ```
- Clica em **"Redeploy"**

---

## 📱 Atualizar Mobile App

No ficheiro `mobile/src/services/api.js`:

```javascript
const API_URL = __DEV__ 
  ? 'http://localhost:3333/api'
  : 'https://dnvt-api.vercel.app/api';
```

---

## ✅ Testar

### Frontend:
```
https://dnvt-admin.vercel.app
```

### Backend:
```
https://dnvt-api.vercel.app/api/health
```

### Login no Admin:
```
https://dnvt-admin.vercel.app/login
```

---

## 🐛 Troubleshooting

### Frontend retorna 404
- Verifica se o build completou com sucesso
- Confirma que `Root Directory` está como `frontend`
- Verifica se `Output Directory` está como `build`

### Backend retorna erro
- Verifica se `MONGO_URL` está nas variáveis de ambiente
- Confirma que MongoDB Atlas permite IP `0.0.0.0/0`
- Testa localmente primeiro: `cd backend && npm start`

### CORS Error
- Atualiza `CORS_ORIGINS` no backend com URL correto do frontend
- Faz redeploy do backend após mudar

### Mobile não conecta
- Verifica se `API_URL` aponta para `https://dnvt-api.vercel.app/api`
- Testa o endpoint: `https://dnvt-api.vercel.app/api/health`

---

## 📝 Resumo

✅ **2 Projetos Separados** = Mais simples e confiável
✅ **Frontend**: React SPA em `dnvt-admin.vercel.app`
✅ **Backend**: Node.js API em `dnvt-api.vercel.app`
✅ **Mobile**: Aponta para o backend em produção

**Boa sorte! 🚀**
