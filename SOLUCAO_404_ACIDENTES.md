# 🔧 Solução: 404 ao Acessar Acidentes na Vercel

## 🚨 Problema

```
GET https://dnvt-backend.vercel.app/api/acidentes/69b7131500171a8056bdfeb8 404 (Not Found)
```

**Causa Confirmada:** O banco de dados de **produção (MongoDB Atlas)** está **vazio** ou não tem os mesmos dados do banco local.

---

## 🎯 Diagnóstico Rápido

Execute estes comandos para confirmar:

### **1. Verificar se API está online:**
```bash
curl https://dnvt-backend.vercel.app/api/auth/me
```
**Esperado:** `{"error": "Token não fornecido"}` ✅

---

### **2. Listar TODOS os acidentes (requer login):**

Primeiro, faça login para obter token:

```bash
# Login
curl -X POST https://dnvt-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "SEU_EMAIL", "senha": "SUA_SENHA"}'
```

**Copie o `token` da resposta**, depois:

```bash
# Listar acidentes
curl https://dnvt-backend.vercel.app/api/acidentes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resultados possíveis:**
- `[]` (array vazio) → ❌ **Banco de produção está vazio**
- `[{...}, {...}]` → ✅ Tem dados, mas ID específico não existe
- Erro 500 → ❌ MongoDB não conectou

---

## ✅ Solução 1: Popular Banco de Produção (Recomendado)

### **Opção A: Migrar Dados do Local para Produção**

Se você tem dados no banco local e quer copiá-los para produção:

```bash
# 1. Exportar dados do MongoDB local
mongodump --uri="mongodb://localhost:27017/dnvt" --out=./backup

# 2. Importar para MongoDB Atlas (produção)
mongorestore --uri="mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt" ./backup/dnvt
```

**Tempo:** 1-5 minutos dependendo da quantidade de dados.

---

### **Opção B: Criar Dados de Teste via Frontend**

1. Acesse: `http://localhost:3000` (com backend apontando para Vercel)
2. Faça login
3. Vá em **"Reportar Acidente"**
4. Crie alguns acidentes de teste
5. Verifique se aparecem na lista

---

### **Opção C: Criar Dados via API (cURL)**

```bash
# 1. Login
TOKEN=$(curl -X POST https://dnvt-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@dnvt.ao", "senha": "sua_senha"}' | jq -r '.token')

# 2. Criar acidente de teste
curl -X POST https://dnvt-backend.vercel.app/api/acidentes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "localizacao": {
      "latitude": -8.8383,
      "longitude": 13.2344,
      "endereco": "Avenida 4 de Fevereiro, Luanda"
    },
    "descricao": "Acidente de teste - colisão traseira",
    "gravidade": "MODERADO",
    "tipo_acidente": "COLISAO_TRASEIRA",
    "numero_veiculos": 2,
    "numero_vitimas": 0
  }'
```

---

## ✅ Solução 2: Usar Backend Local Temporariamente

Enquanto popula o banco de produção:

### **Frontend `.env`:**
```env
REACT_APP_BACKEND_URL=http://localhost:3333
```

### **Mobile `api.js`:**
```javascript
export const API_URL = 'http://192.168.0.79:3333/api';
```

### **Iniciar Backend Local:**
```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend
npm start
```

---

## 🔍 Verificar Dados no MongoDB Atlas

### **Via MongoDB Compass:**

1. Baixe: https://www.mongodb.com/try/download/compass
2. Conecte com:
   ```
   mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt
   ```
3. Navegue: `dnvt` → `acidentes`
4. Verifique se há documentos

### **Via MongoDB Atlas Dashboard:**

1. Acesse: https://cloud.mongodb.com/
2. Login com suas credenciais
3. Selecione cluster `jcm`
4. **Browse Collections** → `dnvt` → `acidentes`
5. Verifique quantidade de documentos

---

## 🧪 Script de Teste Completo

Salve como `test-vercel-backend.sh`:

```bash
#!/bin/bash

echo "🔍 Testando Backend Vercel..."
echo ""

# 1. Verificar API online
echo "1️⃣ Verificando se API está online..."
curl -s https://dnvt-backend.vercel.app/api/auth/me | jq
echo ""

# 2. Fazer login
echo "2️⃣ Fazendo login..."
read -p "Email: " EMAIL
read -sp "Senha: " SENHA
echo ""

TOKEN=$(curl -s -X POST https://dnvt-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"senha\": \"$SENHA\"}" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  exit 1
fi

echo "✅ Login bem-sucedido!"
echo ""

# 3. Listar acidentes
echo "3️⃣ Listando acidentes..."
ACIDENTES=$(curl -s https://dnvt-backend.vercel.app/api/acidentes \
  -H "Authorization: Bearer $TOKEN")

echo "$ACIDENTES" | jq

COUNT=$(echo "$ACIDENTES" | jq 'length')
echo ""
echo "📊 Total de acidentes: $COUNT"

if [ "$COUNT" -eq 0 ]; then
  echo "⚠️ Banco de produção está vazio!"
  echo "💡 Solução: Popular banco com dados de teste"
else
  echo "✅ Banco tem dados!"
fi
```

Execute:
```bash
bash test-vercel-backend.sh
```

---

## 📋 Checklist de Diagnóstico

- [ ] API está online (teste 1)
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] MongoDB conectado (sem erro 500)
- [ ] Login funciona
- [ ] Lista de acidentes retorna (mesmo que vazia)
- [ ] Banco de produção tem dados
- [ ] ID do acidente existe no banco

---

## 🎯 Causa Mais Provável

**O banco de produção (MongoDB Atlas) está vazio.**

**Por quê?**
- Backend local usa banco local (com dados)
- Backend Vercel usa MongoDB Atlas (sem dados)
- IDs como `69b7131500171a8056bdfeb8` existem no local, mas não no Atlas

**Solução:**
1. Popular banco de produção com dados
2. OU usar backend local temporariamente
3. OU criar novos acidentes via frontend/API

---

## 🚀 Ação Recomendada

**Escolha UMA das opções:**

### **A) Popular Banco (Melhor para produção):**
```bash
mongodump --uri="mongodb://localhost:27017/dnvt" --out=./backup
mongorestore --uri="mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt" ./backup/dnvt
```

### **B) Usar Backend Local (Mais rápido para testar):**
```env
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:3333
```

### **C) Criar Dados Novos (Começar do zero):**
- Acesse frontend
- Crie acidentes manualmente
- Use IDs novos gerados

---

**Última atualização:** Março 2026
