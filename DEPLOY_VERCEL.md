# 🚀 Deploy DNVT na Vercel

Este guia explica como fazer o deploy do **frontend (admin)** e **backend** na Vercel com MongoDB Atlas.

## 📋 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (já tens)
- Repositório no GitHub (já tens)
- Vercel CLI instalada (opcional): `npm i -g vercel`

---

## 🔧 Passo 1: Preparar o Projeto

### 1.1 Verificar `.gitignore`
Certifica-te que o ficheiro `.env` **NÃO** está no Git:

```bash
# Verificar se .env está ignorado
cat .gitignore | grep .env
```

### 1.2 Criar `.env.example` (Backend)
Já existe, mas verifica se tem todas as variáveis necessárias.

---

## 🌐 Passo 2: Deploy na Vercel (Via Interface Web)

### Opção A: Deploy Automático via GitHub

1. **Acede à Vercel**: https://vercel.com
2. **Faz login** com GitHub
3. **Clica em "Add New Project"**
4. **Importa o repositório** `dnvt` do GitHub
5. **Configura o projeto**:

#### Configurações do Frontend:
- **Framework Preset**: `Create React App`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` ou `yarn build`
- **Output Directory**: `build`
- **Install Command**: `npm install` ou `yarn install`

#### Configurações do Backend:
- **Framework Preset**: `Other`
- **Root Directory**: `backend`
- **Build Command**: (deixar vazio)
- **Output Directory**: (deixar vazio)

6. **Adiciona as Variáveis de Ambiente** (Environment Variables):

```env
MONGO_URL=mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm
CORS_ORIGINS=*
JWT_SECRET=dnvt_super_secret_key_2024_angola_traffic_system
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
PORT=3333
```

⚠️ **IMPORTANTE**: Muda `CORS_ORIGINS` para o domínio do frontend em produção:
```env
CORS_ORIGINS=https://teu-frontend.vercel.app
```

7. **Clica em "Deploy"**

---

## 🔄 Passo 3: Deploy Separado (Recomendado)

É melhor fazer **dois projetos separados** na Vercel:

### 3.1 Deploy do Frontend (Admin)

1. **Novo Projeto** → Importa `dnvt`
2. **Nome**: `dnvt-admin` ou `dnvt-frontend`
3. **Root Directory**: `frontend`
4. **Framework**: `Create React App`
5. **Build Command**: `npm run build`
6. **Output Directory**: `build`
7. **Variáveis de Ambiente**:
```env
REACT_APP_API_URL=https://dnvt-backend.vercel.app/api
```

### 3.2 Deploy do Backend (API)

1. **Novo Projeto** → Importa `dnvt`
2. **Nome**: `dnvt-backend` ou `dnvt-api`
3. **Root Directory**: `backend`
4. **Framework**: `Other`
5. **Variáveis de Ambiente**:
```env
MONGO_URL=mongodb+srv://jaimecesarmanuel:jcm@jcm.xsull.mongodb.net/dnvt?retryWrites=true&w=majority&appName=jcm
CORS_ORIGINS=https://dnvt-admin.vercel.app
JWT_SECRET=dnvt_super_secret_key_2024_angola_traffic_system
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
```

---

## 📱 Passo 4: Configurar Mobile App

Depois do backend estar no ar, atualiza o mobile:

```javascript
// mobile/src/services/api.js
const API_URL = __DEV__ 
  ? 'http://localhost:3333/api'
  : 'https://dnvt-backend.vercel.app/api';
```

---

## 🔐 Passo 5: Segurança MongoDB Atlas

1. **Acede ao MongoDB Atlas**
2. **Network Access** → **Add IP Address**
3. **Adiciona**: `0.0.0.0/0` (permite todos os IPs da Vercel)
   - ⚠️ Ou adiciona IPs específicos da Vercel para mais segurança

---

## ✅ Passo 6: Testar o Deploy

### Frontend:
```
https://dnvt-admin.vercel.app
```

### Backend:
```
https://dnvt-backend.vercel.app/api/health
```

---

## 🔄 Passo 7: Deploy Automático (CI/CD)

Depois do primeiro deploy, **qualquer push** para o GitHub faz deploy automático:

- **Branch `main`** → Deploy em produção
- **Outras branches** → Deploy de preview

---

## 🛠️ Comandos Úteis (Vercel CLI)

Se preferires usar a CLI:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy do frontend
cd frontend
vercel

# Deploy do backend
cd backend
vercel

# Deploy em produção
vercel --prod
```

---

## 📝 Notas Importantes

1. **MongoDB Atlas** já está configurado (conexão funciona)
2. **Variáveis de ambiente** devem ser configuradas na Vercel (não no código)
3. **CORS** deve permitir apenas o domínio do frontend em produção
4. **JWT_SECRET** deve ser forte em produção (considera mudar)
5. **Mobile app** precisa apontar para a API em produção

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
- Verifica se `package.json` tem todas as dependências
- Corre `npm install` localmente para testar

### Erro: "MongoDB connection failed"
- Verifica se o IP `0.0.0.0/0` está permitido no MongoDB Atlas
- Confirma que `MONGO_URL` está nas variáveis de ambiente da Vercel

### Erro: "CORS blocked"
- Atualiza `CORS_ORIGINS` com o domínio correto do frontend
- Verifica se o backend está a usar `cors` middleware

### Frontend não conecta ao Backend
- Verifica se `REACT_APP_API_URL` está configurado
- Confirma que o backend está online: `https://teu-backend.vercel.app/api/health`

---

## 📧 Suporte

Se tiveres problemas:
1. Verifica os **logs** na Vercel Dashboard
2. Testa localmente primeiro: `npm start` (frontend) e `npm run dev` (backend)
3. Confirma que MongoDB Atlas aceita conexões externas

---

**Boa sorte com o deploy! 🚀**
