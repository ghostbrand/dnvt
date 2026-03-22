# 🔧 Correções Finais do Backend para Vercel

## 🚨 Problemas Identificados nos Logs

### **1. StrictPopulateError**
```
Cannot populate path `reportado_por` because it is not in your schema.
Cannot populate path `zona_critica` because it is not in your schema.
Cannot populate path `delegacao` because it is not in your schema.
```

### **2. MongoServerError - Agregação**
```
hour parameter 'date' must be coercible to date
dayOfWeek parameter 'date' must be coercible to date
```

---

## ✅ Correções Implementadas

### **Correção 1: Remover Populates Inválidos**

#### **Arquivo: `src/routes/acidentes.js`**

**Problema:** Tentava popular campos que não existem no schema `Acidente`:
- ❌ `reportado_por`
- ❌ `validado_por`
- ❌ `atendido_por`
- ❌ `resolvido_por`
- ❌ `zona_critica`

**Schema atual do Acidente:**
```javascript
{
  acidente_id: String,
  latitude: Number,
  longitude: Number,
  endereco: String,
  descricao: String,
  gravidade: String,
  // ... outros campos
  created_by: String,  // ← String, não ObjectId
  updated_by: String   // ← String, não ObjectId
}
```

**Correção aplicada:**
```javascript
// ANTES
acidente = await Acidente.findById(id)
  .populate('reportado_por', 'name email')
  .populate('validado_por', 'name email')
  .populate('atendido_por', 'name email')
  .populate('resolvido_por', 'name email');

// DEPOIS
acidente = await Acidente.findById(id);
```

---

#### **Arquivo: `src/routes/utilizadores.js`**

**Problema:** Tentava popular campos que não existem no schema `User`:
- ❌ `delegacao`
- ❌ `zonas_monitoradas`

**Schema atual do User:**
```javascript
{
  email: String,
  name: String,
  role: String,
  // ... outros campos
  zonas_notificacao: [String],  // ← Array de Strings, não ObjectIds
  aprovado_por: ObjectId        // ← Único campo populável
}
```

**Correção aplicada:**
```javascript
// ANTES
const users = await User.find()
  .select('-password')
  .populate('delegacao', 'nome')
  .populate('zonas_monitoradas', 'nome');

// DEPOIS
const users = await User.find()
  .select('-password');
```

---

### **Correção 2: Agregações MongoDB com Datas**

#### **Arquivos: `server.js` e `src/routes/estatisticas.js`**

**Problema:** MongoDB não conseguia usar `$hour` e `$dayOfWeek` porque `created_at` pode estar armazenado como string em alguns documentos.

**Erro:**
```
hour parameter 'date' must be coercible to date
```

**Correção aplicada:**

```javascript
// ANTES
const result = await Acidente.aggregate([
  { $group: { _id: { $hour: '$created_at' }, acidentes: { $sum: 1 } } }
]);

// DEPOIS
const result = await Acidente.aggregate([
  { $addFields: { created_at_date: { $toDate: '$created_at' } } },
  { $group: { _id: { $hour: '$created_at_date' }, acidentes: { $sum: 1 } } }
]);
```

**O que faz:**
- `$addFields` cria campo temporário `created_at_date`
- `$toDate` converte string/timestamp para Date
- Agregação usa o campo convertido

**Endpoints corrigidos:**
- `/api/estatisticas/por-hora`
- `/api/estatisticas/por-dia-semana`

---

### **Correção 3: Campo zonas_monitoradas → zonas_notificacao**

**Problema:** Código usava `zonas_monitoradas` mas schema tem `zonas_notificacao`.

**Correção:**
```javascript
// ANTES
const zoneIds = user.zonas_monitoradas.map(z => z._id);

// DEPOIS
const zoneIds = user.zonas_notificacao;
```

**Por quê?** 
- `zonas_notificacao` é array de Strings (IDs diretos)
- Não precisa de `.map()` ou populate

---

## 📋 Resumo das Mudanças

| Arquivo | Mudanças | Linhas |
|---------|----------|--------|
| `src/routes/acidentes.js` | Removido 8 populates inválidos | 60-73, 18-21 |
| `src/routes/utilizadores.js` | Removido 10 populates inválidos | 15-16, 43-44, 102-104, 113-114, 165-166 |
| `src/routes/estatisticas.js` | Adicionado $toDate em 2 agregações | 60-72, 92-104 |
| `server.js` | Adicionado $toDate em 2 agregações | 810, 828 |

**Total:** 4 arquivos, ~22 correções

---

## 🚀 Como Aplicar as Correções

### **1. Commit das Mudanças:**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend

# Verificar mudanças
git status

# Adicionar arquivos modificados
git add src/routes/acidentes.js
git add src/routes/utilizadores.js
git add src/routes/estatisticas.js
git add server.js

# Commit
git commit -m "fix: remover populates inválidos e corrigir agregações MongoDB"

# Push para GitHub
git push origin main
```

---

### **2. Aguardar Deploy Automático:**

- Vercel detecta push no GitHub
- Faz build e deploy automático
- **Tempo:** 1-3 minutos

**Verificar deploy:**
1. Acesse: https://vercel.com/dashboard
2. Selecione `dnvt-backend`
3. **Deployments** → Veja status do último deploy

---

### **3. Testar Após Deploy:**

```bash
# 1. Login
TOKEN=$(curl -s -X POST https://dnvt-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "SEU_EMAIL", "senha": "SUA_SENHA"}' | jq -r '.token')

# 2. Testar acidente (antes dava 404)
curl https://dnvt-backend.vercel.app/api/acidentes/69b5ece097a8d57e73a22eac \
  -H "Authorization: Bearer $TOKEN"

# 3. Testar utilizadores (antes dava erro)
curl https://dnvt-backend.vercel.app/api/utilizadores \
  -H "Authorization: Bearer $TOKEN"

# 4. Testar estatísticas por hora (antes dava erro)
curl https://dnvt-backend.vercel.app/api/estatisticas/por-hora

# 5. Testar estatísticas por dia (antes dava erro)
curl https://dnvt-backend.vercel.app/api/estatisticas/por-dia-semana
```

**Resultados esperados:**
- ✅ Status 200 (não mais 404 ou 304 com erro)
- ✅ Dados JSON retornados
- ✅ Sem erros `StrictPopulateError`
- ✅ Sem erros `MongoServerError`

---

## 🔍 Verificar Logs da Vercel

Após deploy:

1. Acesse: https://vercel.com/dashboard
2. Selecione `dnvt-backend`
3. **Deployments** → Último deployment
4. **Function Logs**
5. Verifique que **NÃO há mais:**
   - ❌ `StrictPopulateError`
   - ❌ `hour parameter 'date' must be coercible to date`
   - ❌ `dayOfWeek parameter 'date' must be coercible to date`

---

## ✅ Checklist Final

- [x] Removido populates de `zona_critica`
- [x] Removido populates de `reportado_por`, `validado_por`, etc
- [x] Removido populates de `delegacao`
- [x] Removido populates de `zonas_monitoradas`
- [x] Corrigido agregação `/por-hora` com `$toDate`
- [x] Corrigido agregação `/por-dia-semana` com `$toDate`
- [x] Corrigido referência `zonas_monitoradas` → `zonas_notificacao`
- [ ] Commit das correções
- [ ] Push para GitHub
- [ ] Deploy na Vercel
- [ ] Testar endpoints
- [ ] Verificar logs sem erros

---

## 🎯 Resultado Esperado

Após deploy e testes:

✅ **Endpoints funcionando:**
- `/api/acidentes/:id` - Retorna acidente sem erro
- `/api/utilizadores` - Lista usuários sem erro
- `/api/estatisticas/por-hora` - Estatísticas por hora
- `/api/estatisticas/por-dia-semana` - Estatísticas por dia

✅ **Logs limpos:**
- Sem `StrictPopulateError`
- Sem `MongoServerError`
- Sem erros 404 causados por populate

✅ **Frontend funcional:**
- Pode buscar acidentes
- Pode listar usuários
- Estatísticas carregam corretamente

---

## 📝 Notas Importantes

### **Por que os populates falhavam?**

O schema `Acidente` não tem campos de referência (ObjectId) para usuários:
```javascript
created_by: String,  // ← String simples, não ObjectId
updated_by: String   // ← String simples, não ObjectId
```

Se precisar de informações do usuário, deve:
1. Buscar acidente
2. Buscar usuário separadamente usando `created_by` como filtro
3. Ou adicionar campos ObjectId ao schema e migrar dados

### **Por que $toDate é necessário?**

MongoDB pode armazenar datas como:
- `Date` (tipo nativo)
- `String` (ISO 8601)
- `Number` (timestamp)

`$toDate` garante conversão para Date antes de usar `$hour` ou `$dayOfWeek`.

---

**Última atualização:** Março 2026
