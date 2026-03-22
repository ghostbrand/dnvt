# 🔍 Diagnóstico: Backend na Vercel Retorna 404

## 🚨 Problema Identificado

**Sintoma:**
```
GET https://dnvt-backend.vercel.app/api/acidentes/69b7131500171a8056bdfeb8 404 (Not Found)
```

**Comportamento:**
- ✅ Backend **local** funciona perfeitamente
- ❌ Backend **Vercel** retorna 404 para alguns endpoints
- ❌ Acidentes específicos não são encontrados

---

## 🔎 Causas Prováveis

### **1. Banco de Dados Diferente** (Mais Provável)

**Problema:**
- Backend local conecta ao MongoDB local ou dev
- Backend Vercel conecta ao MongoDB de produção
- **Dados não existem no banco de produção**

**Evidência:**
- ID `69b7131500171a8056bdfeb8` existe no banco local
- Mesmo ID não existe no banco da Vercel

**Solução:**
- Verificar variável `MONGO_URL` na Vercel
- Confirmar que aponta para o banco correto
- Popular banco de produção com dados

---

### **2. Variáveis de Ambiente Não Configuradas**

**Problema:**
- `.env` não é enviado ao Git (gitignored)
- Vercel não tem as variáveis de ambiente configuradas
- Backend não consegue conectar ao MongoDB

**Solução:**
- Configurar variáveis de ambiente no dashboard da Vercel

---

### **3. Backend Não Deployado Corretamente**

**Problema:**
- Código não foi enviado para Vercel
- Deploy falhou silenciosamente
- Vercel está servindo versão antiga

**Solução:**
- Fazer novo deploy manual
- Verificar logs de build na Vercel

---

## ✅ Verificações Necessárias

### **Passo 1: Verificar se Backend Está Online**

```bash
# Teste básico
curl https://dnvt-backend.vercel.app/api/auth/me
```

**Resultado esperado:**
```json
{"error": "Token não fornecido"}
```

**Se retornar 404 ou erro:** Backend não está deployado.

---

### **Passo 2: Verificar Conexão com MongoDB**

```bash
# Teste endpoint que não requer auth
curl https://dnvt-backend.vercel.app/api/estatisticas/resumo
```

**Se retornar dados:** MongoDB conectado ✅  
**Se retornar 500:** MongoDB não conectado ❌

---

### **Passo 3: Verificar Variáveis de Ambiente na Vercel**

1. Acesse: https://vercel.com/dashboard
2. Selecione projeto `dnvt-backend`
3. Vá em **Settings** → **Environment Variables**
4. Verifique se existem:

```env
MONGO_URL=mongodb+srv://...
CORS_ORIGINS=*
JWT_SECRET=dnvt_super_secret_key_2024_angola_traffic_system
PORT=3333
```

**Se não existirem:** Adicione manualmente.

---

### **Passo 4: Verificar Logs de Deploy**

1. Acesse: https://vercel.com/dashboard
2. Selecione projeto `dnvt-backend`
3. Vá em **Deployments**
4. Clique no último deployment
5. Veja **Build Logs** e **Function Logs**

**Procure por:**
- ❌ Erros de build
- ❌ Erros de conexão MongoDB
- ❌ Erros de módulos faltando

---

## 🔧 Soluções

### **Solução 1: Configurar Variáveis de Ambiente**

#### **No Dashboard da Vercel:**

1. Acesse: https://vercel.com/dashboard
2. Selecione `dnvt-backend`
3. **Settings** → **Environment Variables**
4. Adicione cada variável:

| Nome | Valor |
|------|-------|
| `MONGO_URL` | `mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm` |
| `CORS_ORIGINS` | `*` |
| `JWT_SECRET` | `dnvt_super_secret_key_2024_angola_traffic_system` |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRY_HOURS` | `24` |
| `PORT` | `3333` |

5. Clique **Save**
6. **Redeploy** o projeto

---

### **Solução 2: Fazer Deploy Manual**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend

# Verificar se há mudanças não commitadas
git status

# Commit mudanças recentes (CORS, etc)
git add .
git commit -m "fix: melhorar configuração CORS e adicionar headers Vercel"
git push origin main

# OU deploy direto com Vercel CLI
npm install -g vercel
vercel login
vercel --prod
```

---

### **Solução 3: Popular Banco de Produção**

Se o banco de produção estiver vazio:

#### **Opção A: Migrar Dados do Local para Produção**

```bash
# Exportar dados do MongoDB local
mongodump --uri="mongodb://localhost:27017/dnvt" --out=./backup

# Importar para MongoDB Atlas (produção)
mongorestore --uri="mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt" ./backup/dnvt
```

#### **Opção B: Criar Dados de Teste via API**

```bash
# Criar acidente de teste
curl -X POST https://dnvt-backend.vercel.app/api/acidentes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "localizacao": {"latitude": -8.8383, "longitude": 13.2344},
    "descricao": "Teste de acidente",
    "gravidade": "LEVE"
  }'
```

---

## 🧪 Teste Completo de Diagnóstico

Execute estes comandos para diagnosticar:

```bash
# 1. Verificar se API está online
curl https://dnvt-backend.vercel.app/api/auth/me

# 2. Verificar estatísticas (não requer auth)
curl https://dnvt-backend.vercel.app/api/estatisticas/resumo

# 3. Verificar acidentes (requer auth)
curl https://dnvt-backend.vercel.app/api/acidentes \
  -H "Authorization: Bearer SEU_TOKEN"

# 4. Verificar acidente específico
curl https://dnvt-backend.vercel.app/api/acidentes/69b7131500171a8056bdfeb8 \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Anote os resultados:**
- [ ] API online (200 ou 401)
- [ ] Estatísticas retornam dados
- [ ] Lista de acidentes retorna
- [ ] Acidente específico retorna

---

## 📋 Checklist de Verificação

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] `MONGO_URL` aponta para banco correto
- [ ] Backend deployado com sucesso (sem erros)
- [ ] MongoDB conectado (verificar logs)
- [ ] Banco de produção tem dados
- [ ] CORS configurado corretamente
- [ ] Endpoints básicos funcionam
- [ ] Autenticação funciona

---

## 🔄 Alternativa: Usar Backend Local Temporariamente

Enquanto resolve o problema da Vercel:

### **Frontend:**
```env
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:3333
```

### **Mobile:**
```javascript
// mobile/src/services/api.js
export const API_URL = 'http://SEU_IP:3333/api';
```

### **Iniciar Backend Local:**
```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend
npm start
```

---

## 🔗 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **Vercel Logs:** https://vercel.com/docs/observability/runtime-logs
- **Vercel Environment Variables:** https://vercel.com/docs/projects/environment-variables

---

## 📞 Próximos Passos

1. **Acesse Vercel Dashboard** e verifique variáveis de ambiente
2. **Verifique logs** do último deployment
3. **Teste endpoints** com curl
4. **Configure variáveis** se estiverem faltando
5. **Redeploy** se necessário
6. **Popule banco** se estiver vazio

---

**Última atualização:** Março 2026
