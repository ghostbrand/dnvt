# 🚀 Deploy em 2 Projetos Separados na Vercel

## 📋 Arquitetura Final

```
Frontend (Vercel)          Backend (Vercel)
https://dnvt-admin         https://dnvt-api
.vercel.app                .vercel.app/api
     ↓                            ↓
  React App              Express + MongoDB
```

---

## 🎯 PROJETO 1: Frontend (Admin Panel)

### **1. Criar Projeto Frontend**

1. Vai para: https://vercel.com/new
2. Importa repositório: `ghostbrand/dnvt`
3. Clica em **"Import"**

**Configurações:**

- **Project Name**: `dnvt-admin` (ou `dnvt-frontend`)
- **Framework Preset**: `Create React App`
- **Root Directory**: `frontend` ⚠️
- **Build Command**: `npm install --legacy-peer-deps && npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install --legacy-peer-deps`

**Environment Variables:**

```
DISABLE_ESLINT_PLUGIN=true
REACT_APP_API_URL=https://dnvt-api.vercel.app/api
```

*(Atualiza `REACT_APP_API_URL` depois de ter o URL do backend)*

### **2. Deploy Frontend**

Clica em **"Deploy"** e aguarda 3-5 minutos.

**URL final**: `https://dnvt-admin.vercel.app` (ou similar)

---

## 🔧 PROJETO 2: Backend (API Express)

### **1. Criar Projeto Backend**

1. Vai para: https://vercel.com/new
2. Importa o **mesmo repositório**: `ghostbrand/dnvt`
3. Clica em **"Import"**

**Configurações:**

- **Project Name**: `dnvt-api` (ou `dnvt-backend`)
- **Framework Preset**: `Other`
- **Root Directory**: `backend` ⚠️
- **Build Command**: (deixar vazio)
- **Output Directory**: (deixar vazio)
- **Install Command**: `npm install`

**Environment Variables:**

```
MONGO_URL
mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm

CORS_ORIGINS
https://dnvt-admin.vercel.app

JWT_SECRET
dnvt_super_secret_key_2024_angola_traffic_system

JWT_ALGORITHM
HS256

JWT_EXPIRY_HOURS
24

PORT
3333
```

*(Atualiza `CORS_ORIGINS` com o URL do frontend depois do deploy)*

### **2. Deploy Backend**

Clica em **"Deploy"** e aguarda 3-5 minutos.

**URL final**: `https://dnvt-api.vercel.app` (ou similar)

---

## 🔄 Pós-Deploy: Atualizar URLs

### **1. Atualizar Frontend**

Depois do backend estar online:

1. Vai para o projeto **frontend** na Vercel
2. **Settings** → **Environment Variables**
3. Edita `REACT_APP_API_URL`:
   ```
   https://dnvt-api.vercel.app/api
   ```
4. **Deployments** → **Redeploy** (último deployment)

### **2. Atualizar Backend**

Depois do frontend estar online:

1. Vai para o projeto **backend** na Vercel
2. **Settings** → **Environment Variables**
3. Edita `CORS_ORIGINS`:
   ```
   https://dnvt-admin.vercel.app
   ```
4. **Deployments** → **Redeploy** (último deployment)

---

## 📱 Atualizar Mobile App

Atualiza `mobile/src/services/api.js`:

```javascript
export const API_URL = __DEV__
  ? `http://${DEV_HOST}:3333/api`
  : 'https://dnvt-api.vercel.app/api';
```

---

## ✅ Testar

### **Frontend:**
```
https://dnvt-admin.vercel.app
```

### **Backend Health:**
```
https://dnvt-api.vercel.app/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected",
  "message": "DNVT API is running"
}
```

### **Backend Login:**
```
POST https://dnvt-api.vercel.app/api/auth/login
```

---

## 🎯 URLs Finais

**Frontend (Admin)**: `https://dnvt-admin.vercel.app`
**Backend (API)**: `https://dnvt-api.vercel.app/api`
**Mobile**: Aponta para `https://dnvt-api.vercel.app/api`

---

## ⚠️ Notas Importantes

### **Backend Express em Serverless:**
- ✅ Todas as rotas funcionam (auth, acidentes, zonas, etc.)
- ✅ MongoDB funciona com cache de conexão
- ❌ WebSocket NÃO funciona (serverless não suporta)
- ⚠️ Primeira request pode demorar (cold start)

### **Se WebSocket for Necessário:**
Use **Render.com** para o backend (ver `RENDER_DEPLOY.md`)

---

## 🐛 Troubleshooting

### Frontend não carrega
- Verifica se `REACT_APP_API_URL` está correto
- Verifica console do browser para erros

### Backend dá 500
- Verifica logs na Vercel: **Deployments** → **Functions**
- Confirma que `MONGO_URL` está correto
- Verifica se MongoDB Atlas permite IP `0.0.0.0/0`

### CORS Error
- Confirma que `CORS_ORIGINS` no backend tem URL do frontend
- Faz redeploy do backend após mudar

---

**Boa sorte! 🚀**
