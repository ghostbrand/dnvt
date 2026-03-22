# 🚀 Comandos Rápidos - DNVT Mobile

## 📦 Gerar APK/AAB para Play Store

### 1️⃣ Primeira Vez (Configuração Inicial)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Inicializar projeto EAS
eas init

# Configurar credenciais (keystore)
eas credentials
```

---

### 2️⃣ Gerar Build de Produção (AAB para Play Store)

```bash
# Opção 1: Usando npm script
npm run build:android:production

# Opção 2: Comando direto
eas build --platform android --profile production
```

**Resultado:** Arquivo `.aab` pronto para upload no Google Play Console

---

### 3️⃣ Gerar APK para Testes (Instalar Diretamente)

```bash
# APK para testes internos
npm run build:android:preview

# Ou
eas build --platform android --profile preview
```

**Resultado:** Arquivo `.apk` que pode ser instalado diretamente em dispositivos Android

---

### 4️⃣ Submeter Automaticamente ao Play Store

```bash
# Após configurar service account do Google Play
npm run submit:android

# Ou
eas submit --platform android --profile production
```

---

## 🔄 Atualizar Versão do App

### Antes de cada novo build:

1. **Editar `app.json`:**
```json
{
  "expo": {
    "version": "1.0.1",     // ← Incrementar (visível para usuários)
    "android": {
      "versionCode": 2      // ← Sempre aumentar (2, 3, 4...)
    }
  }
}
```

2. **Gerar novo build:**
```bash
npm run build:android:production
```

---

## 📊 Verificar Status dos Builds

```bash
# Listar todos os builds
eas build:list

# Ver detalhes de um build específico
eas build:view [BUILD_ID]
```

---

## 🔐 Gerenciar Credenciais (Keystore)

```bash
# Configurar/visualizar credenciais
eas credentials

# Fazer backup da keystore
eas credentials --platform android
# Escolha: "Download credentials"
```

**⚠️ IMPORTANTE:** Guarde a keystore em local seguro! Sem ela, não poderá atualizar o app.

---

## 🧪 Desenvolvimento Local

```bash
# Iniciar servidor de desenvolvimento
npm start

# Rodar no Android (emulador ou dispositivo)
npm run android

# Rodar no iOS (apenas Mac)
npm run ios
```

---

## 📱 Instalar APK Diretamente no Dispositivo

### Após gerar APK de preview:

1. **Download do APK:**
   - Link aparece no terminal após build
   - Ou acesse: https://expo.dev/accounts/[sua-conta]/projects/dnvt-mobile/builds

2. **Transferir para dispositivo:**
   ```bash
   # Via USB (ADB)
   adb install caminho/para/app.apk
   
   # Ou envie por email/WhatsApp e abra no celular
   ```

3. **Instalar:**
   - Abra o arquivo `.apk` no celular
   - Permita "Instalar de fontes desconhecidas"
   - Clique em "Instalar"

---

## 🐛 Solução de Problemas

### Build falha

```bash
# Ver logs detalhados
eas build:list
# Clique no build com erro

# Limpar cache e tentar novamente
eas build --platform android --profile production --clear-cache
```

### Erro de credenciais

```bash
# Reconfigurar keystore
eas credentials
# Escolha: "Set up a new Android Keystore"
```

### App não instala

```bash
# Desinstalar versão antiga
adb uninstall ao.gov.dnvt.mobile

# Instalar nova versão
adb install app.apk
```

---

## 📋 Checklist Antes de Publicar

- [ ] Versão atualizada em `app.json`
- [ ] `versionCode` incrementado
- [ ] Google Maps API Key configurada
- [ ] Assets (ícone, splash) atualizados
- [ ] App testado em dispositivos reais
- [ ] Build AAB gerado com sucesso
- [ ] Notas da versão preparadas

---

## 🔗 Links Úteis

- **Expo Dashboard:** https://expo.dev/
- **Google Play Console:** https://play.google.com/console
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Guia Completo:** Ver `GUIA_PUBLICACAO_PLAY_STORE.md`

---

**Última atualização:** Março 2026
