# ✅ Correção: StrictPopulateError no Backend Vercel

## 🚨 Problema Real Identificado

**Erro nos logs da Vercel:**
```
StrictPopulateError: Cannot populate path `zona_critica` because it is not in your schema.
StrictPopulateError: Cannot populate path `delegacao` because it is not in your schema.
```

**Causa:**
O código estava tentando fazer `.populate()` de campos que **não existem** nos schemas do Mongoose:
- ❌ `zona_critica` não existe no schema `Acidente`
- ❌ `delegacao` não existe no schema `User`
- ❌ `zonas_monitoradas` não existe no schema `User`

**Por que funcionava no local?**
- Mongoose versão antiga pode ter ignorado populates inválidos
- Vercel usa versão mais recente com `strictPopulate: true` por padrão

---

## ✅ Correções Implementadas

### **1. Arquivo: `src/routes/acidentes.js`**

**Removido populate de `zona_critica`:**

**Antes:**
```javascript
acidente = await Acidente.findById(id)
  .populate('zona_critica')  // ← Campo não existe
  .populate('reportado_por', 'name email')
  .populate('validado_por', 'name email')
```

**Depois:**
```javascript
acidente = await Acidente.findById(id)
  .populate('reportado_por', 'name email')
  .populate('validado_por', 'name email')
```

**Locais corrigidos:**
- Linha 60-64: GET `/acidentes/:id` (busca por _id)
- Linha 69-73: GET `/acidentes/:id` (busca por acidente_id)
- Linha 22-26: GET `/acidentes/urgencias` (urgências)

---

### **2. Arquivo: `src/routes/utilizadores.js`**

**Removido populate de `delegacao` e `zonas_monitoradas`:**

**Antes:**
```javascript
const user = await User.findById(decoded.userId)
  .select('-password')
  .populate('delegacao', 'nome')  // ← Campos não existem
  .populate('zonas_monitoradas', 'nome')
```

**Depois:**
```javascript
const user = await User.findById(decoded.userId)
  .select('-password')
```

**Locais corrigidos:**
- Linha 15-16: GET `/utilizadores/me`
- Linha 39-44: PATCH `/utilizadores/me`
- Linha 102-104: GET `/utilizadores`
- Linha 113-114: GET `/utilizadores/:id`
- Linha 161-166: PATCH `/utilizadores/:id`

---

## 📋 Schemas Atuais (Referência)

### **Schema `Acidente`:**
```javascript
{
  acidente_id: String,
  latitude: Number,
  longitude: Number,
  endereco: String,
  descricao: String,
  gravidade: String,
  tipo_acidente: String,
  causa_principal: String,
  numero_vitimas: Number,
  numero_veiculos: Number,
  status: String,
  origem_registro: String,
  confirmado_oficialmente: Boolean,
  fotos: [String],
  created_at: Date,
  updated_at: Date,
  created_by: String,
  updated_by: String
}
```

**Campos que PODEM ser populados:**
- ✅ `reportado_por` (ref: User)
- ✅ `validado_por` (ref: User)
- ✅ `atendido_por` (ref: User)
- ✅ `resolvido_por` (ref: User)

**Campos que NÃO existem:**
- ❌ `zona_critica`

---

### **Schema `User`:**
```javascript
{
  email: String,
  password: String,
  name: String,
  role: String,
  telefone: String,
  bilhete_identidade: String,
  endereco: String,
  nivel_acesso: String,
  privilegios: Object,
  push_token: String,
  provincia: String,
  alertas_novos_acidentes: Boolean,
  alertas_sonoros: Boolean,
  alertas_sms: Boolean,
  zonas_notificacao: [String],
  status: String,
  aprovado_por: ObjectId (ref: User),
  aprovado_em: Date
}
```

**Campos que PODEM ser populados:**
- ✅ `aprovado_por` (ref: User)

**Campos que NÃO existem:**
- ❌ `delegacao`
- ❌ `zonas_monitoradas`

---

## 🚀 Próximos Passos

### **1. Fazer Commit das Correções:**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\backend

git add src/routes/acidentes.js src/routes/utilizadores.js
git commit -m "fix: remover populates de campos inexistentes nos schemas"
git push origin main
```

---

### **2. Aguardar Deploy Automático na Vercel:**

- Vercel detecta push no GitHub
- Faz deploy automático
- **Tempo:** 1-3 minutos

**Ou fazer deploy manual:**
```bash
vercel --prod
```

---

### **3. Testar Após Deploy:**

```bash
# 1. Fazer login
TOKEN=$(curl -s -X POST https://dnvt-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "SEU_EMAIL", "senha": "SUA_SENHA"}' | jq -r '.token')

# 2. Testar listar utilizadores (antes dava erro)
curl https://dnvt-backend.vercel.app/api/utilizadores \
  -H "Authorization: Bearer $TOKEN"

# 3. Testar buscar acidente (antes dava 404)
curl https://dnvt-backend.vercel.app/api/acidentes/69b7131500171a8056bdfeb8 \
  -H "Authorization: Bearer $TOKEN"
```

**Resultados esperados:**
- ✅ Sem erros `StrictPopulateError`
- ✅ Dados retornados corretamente
- ✅ Status 200 (não mais 404)

---

## 🔍 Verificar Logs da Vercel

Após deploy:

1. Acesse: https://vercel.com/dashboard
2. Selecione `dnvt-backend`
3. **Deployments** → Último deployment
4. **Function Logs**
5. Verifique se **não há mais** erros `StrictPopulateError`

---

## 📊 Resumo das Mudanças

| Arquivo | Mudanças | Linhas Afetadas |
|---------|----------|-----------------|
| `src/routes/acidentes.js` | Removido `.populate('zona_critica')` | 3 locais |
| `src/routes/utilizadores.js` | Removido `.populate('delegacao')` e `.populate('zonas_monitoradas')` | 5 locais |

**Total:** 8 correções em 2 arquivos

---

## ✅ Checklist

- [x] Identificado erro real (StrictPopulateError)
- [x] Removido populate de `zona_critica`
- [x] Removido populate de `delegacao`
- [x] Removido populate de `zonas_monitoradas`
- [ ] Commit das correções
- [ ] Push para GitHub
- [ ] Deploy na Vercel
- [ ] Testar endpoints
- [ ] Verificar logs sem erros

---

## 🎯 Resultado Esperado

Após deploy:
- ✅ Endpoint `/api/acidentes/:id` funciona (não mais 404)
- ✅ Endpoint `/api/utilizadores` funciona (não mais erro)
- ✅ Logs da Vercel sem erros `StrictPopulateError`
- ✅ Frontend consegue buscar acidentes e usuários

---

**Última atualização:** Março 2026
