# 🚀 Deploy do Backend - Instruções

## ✅ Frontend já está online!
**URL**: https://dnvt-ten.vercel.app/

---

## 🔧 Deploy do Backend (API)

### **Passo 1: Criar Novo Projeto na Vercel**

1. Acede a: https://vercel.com/new
2. **Importa o repositório**: `ghostbrand/dnvt` (o mesmo)
3. **Nome do projeto**: `dnvt-api` ou `dnvt-backend`

---

### **Passo 2: Configurações do Projeto**

**Framework Preset**: `Other`

**Root Directory**: `backend` ⚠️ **MUITO IMPORTANTE**

**Build Command**: (deixar vazio)

**Output Directory**: (deixar vazio)

**Install Command**: `npm install`

---

### **Passo 3: Environment Variables**

Adiciona estas variáveis (clica em "Add" para cada uma):

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

### **Passo 4: Deploy**

Clica em **"Deploy"** e aguarda o build completar.

**URL esperado**: `https://dnvt-api.vercel.app` (ou similar)

---

### **Passo 5: Testar o Backend**

Depois do deploy, testa:
```
https://SEU-BACKEND-URL.vercel.app/api/health
```

Deve retornar algo como:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

---

## 📱 Atualizar Mobile App

Depois do backend estar online, atualiza o ficheiro:

**`mobile/src/services/api.js`**

Linha 14, muda de:
```javascript
: 'https://your-production-url.com/api';
```

Para:
```javascript
: 'https://SEU-BACKEND-URL.vercel.app/api';
```

Exemplo:
```javascript
export const API_URL = __DEV__
  ? `http://${DEV_HOST}:3333/api`
  : 'https://dnvt-api.vercel.app/api';
```

---

## 🔄 Atualizar Frontend (se necessário)

Se o frontend precisar de chamar o backend, cria ficheiro:

**`frontend/.env.production`**
```env
REACT_APP_API_URL=https://SEU-BACKEND-URL.vercel.app/api
```

E faz redeploy do frontend.

---

## ✅ Checklist Final

- [ ] Backend deployado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Endpoint `/api/health` a funcionar
- [ ] MongoDB Atlas permite conexões (IP `0.0.0.0/0`)
- [ ] CORS configurado com URL do frontend
- [ ] Mobile app atualizado com URL do backend
- [ ] Testado login no mobile

---

## 🎯 URLs Finais

**Frontend (Admin)**: https://dnvt-ten.vercel.app/
**Backend (API)**: https://SEU-BACKEND-URL.vercel.app/api
**Mobile**: Aponta para o backend em produção

---

**Boa sorte! 🚀**
