# 🚀 Deploy Backend no Render.com

## ⚠️ Por Que Render ao Invés de Vercel?

A Vercel tem limitações para backends complexos com:
- Conexões MongoDB persistentes
- WebSocket
- Processos de longa duração

O **Render.com** é melhor para backends Node.js tradicionais.

---

## 📋 Passo a Passo - Deploy no Render

### **1. Criar Conta no Render**

1. Vai para: https://render.com
2. Clica em **"Get Started"**
3. Faz login com **GitHub**

---

### **2. Criar Web Service**

1. No dashboard, clica em **"New +"** → **"Web Service"**
2. Conecta o repositório **`ghostbrand/dnvt`**
3. Clica em **"Connect"**

---

### **3. Configurações do Serviço**

**Name**: `dnvt-backend` (ou outro nome)

**Region**: `Frankfurt (EU Central)` (mais próximo de Angola)

**Branch**: `main`

**Root Directory**: `backend`

**Runtime**: `Node`

**Build Command**: 
```bash
npm install
```

**Start Command**:
```bash
node server.js
```

**Instance Type**: `Free` (para começar)

---

### **4. Environment Variables**

Clica em **"Advanced"** → **"Add Environment Variable"**

Adiciona estas variáveis:

```
MONGO_URL
mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm

CORS_ORIGINS
https://dnvt-ten.vercel.app

JWT_SECRET
dnvt_super_secret_key_2024_angola_traffic_system

JWT_ALGORITHM
HS256

JWT_EXPIRY_HOURS
24

PORT
3333
```

---

### **5. Deploy**

1. Clica em **"Create Web Service"**
2. Aguarda o build completar (3-5 minutos)
3. O Render vai dar um URL tipo: `https://dnvt-backend.onrender.com`

---

### **6. Testar Backend**

Depois do deploy, testa:

```
https://dnvt-backend.onrender.com/api/health
```

Deve retornar JSON com status "ok" ✅

---

## 📱 Atualizar Mobile App

Atualiza `mobile/src/services/api.js`:

```javascript
export const API_URL = __DEV__
  ? `http://${DEV_HOST}:3333/api`
  : 'https://dnvt-backend.onrender.com/api';
```

---

## 🌐 Atualizar Frontend (se necessário)

Se o frontend precisar chamar o backend, atualiza:

**`frontend/.env.production`**
```env
REACT_APP_API_URL=https://dnvt-backend.onrender.com/api
```

E faz redeploy do frontend na Vercel.

---

## ⚡ Vantagens do Render

✅ **Funciona com WebSocket**
✅ **Conexões MongoDB persistentes**
✅ **Servidor tradicional (não serverless)**
✅ **Deploy automático via GitHub**
✅ **SSL grátis**
✅ **Logs em tempo real**

---

## 💰 Plano Free

O plano **Free** do Render tem:
- ✅ 750 horas/mês (suficiente para 1 app)
- ⚠️ Dorme após 15 min de inatividade (primeiro request demora ~30s)
- ✅ 512 MB RAM
- ✅ Deploy ilimitados

Para produção real, upgrade para **Starter ($7/mês)** que não dorme.

---

## 🔄 Deploy Automático

Depois do primeiro deploy:
- Qualquer **push para `main`** faz deploy automático
- Podes ver logs em tempo real no dashboard
- Rollback fácil se algo der errado

---

## 🐛 Troubleshooting

### Backend não inicia
- Verifica logs no dashboard do Render
- Confirma que `Start Command` está correto: `node server.js`
- Verifica se todas as env vars estão configuradas

### MongoDB não conecta
- Confirma que `MONGO_URL` está correto
- Verifica se MongoDB Atlas permite IP `0.0.0.0/0`

### CORS Error
- Atualiza `CORS_ORIGINS` com URL do frontend
- Faz redeploy

---

## ✅ Arquitetura Final

```
Frontend (Vercel)
https://dnvt-ten.vercel.app
         ↓
Backend (Render)
https://dnvt-backend.onrender.com/api
         ↓
MongoDB Atlas
```

---

**Boa sorte! 🚀**
