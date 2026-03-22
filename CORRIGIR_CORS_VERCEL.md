# 🔧 Correção de Erro CORS na Vercel

## 🚨 Problema Identificado

**Erro:**
```
Access to fetch at 'https://dnvt-backend.vercel.app//api/auth/me' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
Redirect is not allowed for a preflight request.
```

**Causas:**
1. ❌ URL com barra dupla: `https://dnvt-backend.vercel.app//api` (barra extra)
2. ❌ CORS não configurado corretamente para preflight requests
3. ❌ Headers CORS não configurados no `vercel.json`

---

## ✅ Correções Implementadas

### **1. Frontend: Remover Barra Final da URL** ✅

**Arquivo:** `frontend/.env`

**Antes:**
```env
REACT_APP_BACKEND_URL=https://dnvt-backend.vercel.app/
```

**Depois:**
```env
REACT_APP_BACKEND_URL=https://dnvt-backend.vercel.app
```

**Por quê?** 
- Evita barra dupla quando concatena com `/api/auth/me`
- `https://dnvt-backend.vercel.app` + `/api/auth/me` = ✅ Correto
- `https://dnvt-backend.vercel.app/` + `/api/auth/me` = ❌ `//api` (erro)

---

### **2. Backend: Melhorar Configuração CORS** ✅

**Arquivo:** `backend/server.js`

**Mudanças:**
- ✅ Configuração CORS mais robusta
- ✅ Suporte explícito para preflight requests (OPTIONS)
- ✅ Permite requisições sem origin (mobile apps)
- ✅ Cache de preflight por 24 horas
- ✅ Headers adicionais expostos

**Código adicionado:**
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (corsOrigins === '*') return callback(null, true);
    
    const allowedOrigins = corsOrigins.split(',').map(s => s.trim());
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight explícito
```

---

### **3. Vercel: Configurar Headers CORS** ✅

**Arquivo:** `backend/vercel.json`

**Mudanças:**
- ✅ Headers CORS adicionados às rotas
- ✅ Métodos HTTP permitidos explicitamente
- ✅ Suporte para OPTIONS (preflight)

**Código adicionado:**
```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js",
      "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      "headers": {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,Accept"
      }
    }
  ]
}
```

---

## 🚀 Como Aplicar as Correções

### **Passo 1: Reiniciar Frontend (Já Feito)**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\frontend

# Parar o servidor (Ctrl+C)
# Reiniciar
npm start
```

**Por quê?** O `.env` só é lido ao iniciar o servidor.

---

### **Passo 2: Fazer Deploy do Backend na Vercel**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend

# Fazer commit das mudanças
git add server.js vercel.json
git commit -m "fix: corrigir CORS para permitir preflight requests"
git push origin main

# OU fazer deploy direto com Vercel CLI
vercel --prod
```

**Tempo:** 1-3 minutos para deploy

---

### **Passo 3: Testar a Conexão**

1. **Aguarde o deploy completar** (Vercel mostrará URL)
2. **Abra o frontend:** `http://localhost:3000`
3. **Tente fazer login**
4. **Verifique o console:** Não deve mais ter erros CORS

---

## 🧪 Verificar se Backend Está Acessível

### **Teste 1: Verificar se Backend Está Online**

```bash
# No navegador ou terminal
curl https://dnvt-backend.vercel.app/api/auth/me
```

**Resultado esperado:**
```json
{"error": "Token não fornecido"}
```

Se retornar erro 404 ou redirect, o backend não está deployado corretamente.

---

### **Teste 2: Verificar CORS**

```bash
# Teste preflight request
curl -X OPTIONS https://dnvt-backend.vercel.app/api/auth/me \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

**Resultado esperado:**
```
< HTTP/2 204
< access-control-allow-origin: *
< access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
< access-control-allow-headers: Content-Type,Authorization,X-Requested-With,Accept
```

---

## 🔄 Alternativa: Usar Backend Local

Se o deploy na Vercel estiver com problemas, use o backend local:

### **1. Iniciar Backend Local:**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend
npm start
```

### **2. Atualizar Frontend `.env`:**

```env
REACT_APP_BACKEND_URL=http://localhost:3333
```

### **3. Reiniciar Frontend:**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\frontend
npm start
```

---

## 📋 Checklist de Verificação

- [x] `.env` do frontend sem barra final
- [x] CORS configurado no `server.js`
- [x] Headers CORS no `vercel.json`
- [ ] Backend deployado na Vercel
- [ ] Frontend reiniciado
- [ ] Teste de login funcionando
- [ ] Console sem erros CORS

---

## 🐛 Solução de Problemas

### **Erro persiste após mudanças**

1. **Limpar cache do navegador:**
   - Ctrl+Shift+Delete → Limpar cache
   - Ou abrir em aba anônima (Ctrl+Shift+N)

2. **Verificar se `.env` foi recarregado:**
   ```bash
   # Parar frontend (Ctrl+C)
   # Reiniciar
   npm start
   ```

3. **Verificar se backend foi deployado:**
   - Acesse: https://vercel.com/dashboard
   - Verifique último deploy
   - Veja logs de erro

### **Backend retorna 404**

```bash
# Verificar se index.js existe
ls C:\Users\jaime\Documentos\GitHub\dnvt\backend\index.js

# Se não existir, criar:
# index.js deve exportar o app do server.js
```

### **CORS ainda bloqueado**

```bash
# Verificar variável de ambiente na Vercel
# Dashboard → Settings → Environment Variables
# CORS_ORIGINS deve ser "*" ou incluir "http://localhost:3000"
```

---

## 🔗 Recursos Úteis

- [Vercel CORS Configuration](https://vercel.com/guides/how-to-enable-cors)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Preflight Requests Explained](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)

---

**Última atualização:** Março 2026
