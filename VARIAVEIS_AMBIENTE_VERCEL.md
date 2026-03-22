# ⚙️ Variáveis de Ambiente para Vercel

## ✅ Variáveis Obrigatórias (Do `.env`)

Estas são as variáveis que **DEVEM** estar configuradas na Vercel:

| Variável | Valor | Obrigatória | Descrição |
|----------|-------|-------------|-----------|
| `MONGO_URL` | `mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm` | ✅ **SIM** | Conexão com MongoDB Atlas |
| `CORS_ORIGINS` | `*` | ✅ **SIM** | Origens permitidas para CORS |
| `JWT_SECRET` | `dnvt_super_secret_key_2024_angola_traffic_system` | ✅ **SIM** | Chave secreta para JWT |
| `JWT_ALGORITHM` | `HS256` | ⚠️ Opcional | Algoritmo JWT (padrão: HS256) |
| `JWT_EXPIRY_HOURS` | `24` | ⚠️ Opcional | Expiração do token (padrão: 24h) |
| `PORT` | `3333` | ❌ **NÃO** | Vercel ignora (usa porta automática) |

---

## 📧 Variáveis Opcionais (Email/SMTP)

Estas são **opcionais** - só necessárias se quiser enviar emails de recuperação de senha:

| Variável | Exemplo | Necessária? |
|----------|---------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | ❌ Opcional |
| `SMTP_PORT` | `587` | ❌ Opcional |
| `SMTP_USER` | `seu-email@gmail.com` | ❌ Opcional |
| `SMTP_PASS` | `sua-senha-app` | ❌ Opcional |

**Nota:** Se não configurar SMTP, o sistema funcionará normalmente, mas **não enviará emails** de recuperação de senha.

---

## 🗺️ Variáveis Adicionais (Opcionais)

| Variável | Exemplo | Necessária? | Descrição |
|----------|---------|-------------|-----------|
| `GOOGLE_MAPS_KEY` | `AIza...` | ❌ Opcional | Chave Google Maps (pode ser configurada no banco de dados) |

---

## 📋 Checklist de Configuração na Vercel

### **Passo 1: Acessar Dashboard**
1. Acesse: https://vercel.com/dashboard
2. Selecione projeto `dnvt-backend`
3. Vá em **Settings** → **Environment Variables**

---

### **Passo 2: Adicionar Variáveis Obrigatórias**

Adicione estas **5 variáveis** (copie e cole os valores):

#### **1. MONGO_URL**
```
mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm
```

#### **2. CORS_ORIGINS**
```
*
```

#### **3. JWT_SECRET**
```
dnvt_super_secret_key_2024_angola_traffic_system
```

#### **4. JWT_ALGORITHM** (Opcional)
```
HS256
```

#### **5. JWT_EXPIRY_HOURS** (Opcional)
```
24
```

---

### **Passo 3: NÃO Adicionar**

❌ **NÃO adicione `PORT`** - Vercel gerencia portas automaticamente

---

### **Passo 4: Salvar e Redeploy**

1. Clique **Save** em cada variável
2. Vá em **Deployments**
3. Clique nos **3 pontinhos** do último deployment
4. Clique **Redeploy**
5. Aguarde 1-2 minutos

---

## 🧪 Verificar se Funcionou

Após redeploy, teste:

```bash
# 1. Verificar se API está online
curl https://dnvt-backend.vercel.app/api/auth/me

# Resultado esperado: {"error": "Token não fornecido"}
```

```bash
# 2. Verificar estatísticas (testa conexão MongoDB)
curl https://dnvt-backend.vercel.app/api/estatisticas/resumo

# Resultado esperado: Dados de estatísticas em JSON
```

---

## 🔍 Variáveis Detectadas Automaticamente

Estas variáveis são **detectadas automaticamente** pela Vercel:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `VERCEL` | `1` | Indica ambiente Vercel |
| `VERCEL_ENV` | `production` | Ambiente (production/preview/development) |
| `VERCEL_URL` | `dnvt-backend.vercel.app` | URL do deployment |

**Não precisa configurar** - Vercel adiciona automaticamente.

---

## ⚠️ Importante: Diferença entre Ambientes

### **Desenvolvimento (Local):**
```env
MONGO_URL=mongodb://localhost:27017/dnvt  # ← Banco local
PORT=3333  # ← Porta local
```

### **Produção (Vercel):**
```env
MONGO_URL=mongodb+srv://...  # ← MongoDB Atlas
PORT=ignorado  # ← Vercel usa porta automática
```

---

## 🔐 Segurança

### **Variáveis Sensíveis:**
- ✅ `MONGO_URL` - Contém senha do banco
- ✅ `JWT_SECRET` - Chave de criptografia
- ✅ `SMTP_PASS` - Senha de email

**Nunca commite o `.env` no Git!** (já está no `.gitignore`)

---

## 📊 Resumo

### **Mínimo Necessário (3 variáveis):**
1. `MONGO_URL`
2. `CORS_ORIGINS`
3. `JWT_SECRET`

### **Recomendado (5 variáveis):**
1. `MONGO_URL`
2. `CORS_ORIGINS`
3. `JWT_SECRET`
4. `JWT_ALGORITHM`
5. `JWT_EXPIRY_HOURS`

### **Completo com Email (9 variáveis):**
1-5. As acima +
6. `SMTP_HOST`
7. `SMTP_PORT`
8. `SMTP_USER`
9. `SMTP_PASS`

---

## 🚀 Próximos Passos

Após configurar as variáveis:

1. ✅ Salvar todas as variáveis
2. ✅ Fazer **Redeploy**
3. ✅ Aguardar 1-2 minutos
4. ✅ Testar endpoints (comandos acima)
5. ✅ Verificar logs se houver erro

---

## 🔗 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Env Vars Docs:** https://vercel.com/docs/projects/environment-variables
- **MongoDB Atlas:** https://cloud.mongodb.com/

---

**Última atualização:** Março 2026
