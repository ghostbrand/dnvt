# 📱 Guia Completo: Publicar App DNVT Mobile no Google Play Store

## 📋 Pré-requisitos

### 1. Conta Google Play Console
- Acesse [Google Play Console](https://play.google.com/console)
- Crie uma conta de desenvolvedor (taxa única de $25 USD)
- Complete o perfil da conta

### 2. Ferramentas Necessárias
```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Fazer login no Expo
eas login
```

---

## 🔧 Passo 1: Configurar o Projeto

### 1.1. Atualizar `app.json`

Certifique-se que os seguintes campos estão corretos:

```json
{
  "expo": {
    "name": "DNVT Mobile",
    "slug": "dnvt-mobile",
    "version": "1.0.0",
    "android": {
      "package": "ao.gov.dnvt.mobile",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

**Importante:**
- `version`: Versão visível para usuários (ex: "1.0.0")
- `versionCode`: Número inteiro que aumenta a cada build (1, 2, 3...)
- `package`: Identificador único do app (não pode ser alterado depois)

### 1.2. Configurar Google Maps API Key

Substitua `YOUR_GOOGLE_MAPS_API_KEY` em `app.json` pela sua chave real:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "SUA_CHAVE_AQUI"
    }
  }
}
```

### 1.3. Preparar Assets

Certifique-se que existem:
- `assets/icon.png` (1024x1024 px)
- `assets/adaptive-icon.png` (1024x1024 px)
- `assets/splash.png` (1284x2778 px)

---

## 🏗️ Passo 2: Configurar EAS Build

### 2.1. Inicializar EAS

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\mobile
eas build:configure
```

Isso criará o arquivo `eas.json` (já criado neste projeto).

### 2.2. Criar Projeto no Expo

```bash
eas init
```

Isso criará um projeto no Expo e atualizará o `projectId` em `app.json`.

---

## 🔐 Passo 3: Gerar Keystore (Assinatura do App)

### Opção A: Deixar o EAS Gerenciar (Recomendado)

```bash
eas credentials
```

Escolha:
1. `Android` → `production`
2. `Set up a new Android Keystore`
3. EAS gerará e armazenará a keystore automaticamente

### Opção B: Usar Keystore Própria

Se já tem uma keystore:

```bash
keytool -genkeypair -v -keystore dnvt-release.keystore -alias dnvt-key -keyalg RSA -keysize 2048 -validity 10000
```

Depois configure no EAS:
```bash
eas credentials
# Escolha "Use an existing Keystore"
# Forneça o caminho para dnvt-release.keystore
```

**⚠️ IMPORTANTE:** Guarde a keystore e senha em local seguro! Sem ela, não poderá atualizar o app.

---

## 📦 Passo 4: Gerar o AAB (Android App Bundle)

### 4.1. Build de Produção

```bash
eas build --platform android --profile production
```

**O que acontece:**
1. EAS envia o código para servidores Expo
2. Compila o app na nuvem
3. Assina com a keystore
4. Gera o arquivo `.aab`
5. Fornece link para download

**Tempo estimado:** 10-20 minutos

### 4.2. Download do AAB

Após o build completar:
```bash
# O link aparecerá no terminal
# Ou acesse: https://expo.dev/accounts/[sua-conta]/projects/dnvt-mobile/builds
```

Baixe o arquivo `build-XXXXXXXX.aab`

---

## 🚀 Passo 5: Publicar no Google Play Store

### 5.1. Criar App no Play Console

1. Acesse [Google Play Console](https://play.google.com/console)
2. Clique em **"Criar app"**
3. Preencha:
   - **Nome do app:** DNVT Mobile
   - **Idioma padrão:** Português (Portugal) ou Português (Brasil)
   - **Tipo:** App ou jogo
   - **Gratuito ou pago:** Gratuito
   - **Declarações:** Aceite os termos

### 5.2. Configurar Informações do App

#### **Detalhes do App**
- **Nome do app:** DNVT Mobile
- **Descrição curta:** Sistema de gestão de acidentes de trânsito
- **Descrição completa:**
  ```
  DNVT Mobile é o aplicativo oficial da Direcção Nacional de Viação e Trânsito 
  de Angola para reportar e acompanhar acidentes de trânsito em tempo real.

  Funcionalidades:
  • Reportar acidentes com localização GPS
  • Visualizar acidentes próximos no mapa
  • Receber alertas de acidentes na sua área
  • Acompanhar estatísticas de trânsito
  • Consultar boletins de ocorrência
  ```

#### **Gráficos**
Prepare e envie:
- **Ícone do app:** 512x512 px (PNG)
- **Imagem de destaque:** 1024x500 px
- **Capturas de tela:** Mínimo 2, máximo 8 (16:9 ou 9:16)
  - Resolução: 1080x1920 px ou 1920x1080 px

#### **Categorização**
- **Categoria:** Produtividade ou Ferramentas
- **Tags:** trânsito, acidentes, segurança, angola

### 5.3. Configurar Classificação de Conteúdo

1. Vá em **"Classificação de conteúdo"**
2. Preencha o questionário:
   - **Categoria:** Utilitários, produtividade, comunicação
   - **Violência:** Não
   - **Conteúdo sexual:** Não
   - **Linguagem imprópria:** Não
3. Submeta para classificação

### 5.4. Configurar Público-Alvo

1. **Faixa etária:** 18+ (recomendado para app governamental)
2. **Público infantil:** Não é direcionado a crianças

### 5.5. Upload do AAB

1. Vá em **"Produção"** → **"Criar nova versão"**
2. Clique em **"Upload"** e selecione o arquivo `.aab`
3. Preencha:
   - **Nome da versão:** 1.0.0
   - **Notas da versão:**
     ```
     Versão inicial do DNVT Mobile
     • Reportar acidentes de trânsito
     • Visualizar mapa de acidentes
     • Receber notificações de alertas
     • Consultar estatísticas
     ```

### 5.6. Configurar Países e Regiões

1. **Países disponíveis:** Angola (ou mundial)
2. **Idiomas:** Português

### 5.7. Revisar e Publicar

1. Complete todos os itens obrigatórios (marcados com ⚠️)
2. Clique em **"Revisar versão"**
3. Clique em **"Iniciar lançamento para produção"**

**⏱️ Tempo de revisão:** 1-7 dias (Google revisa o app)

---

## 🔄 Passo 6: Atualizar o App (Versões Futuras)

### 6.1. Atualizar Versão

Em `app.json`:
```json
{
  "expo": {
    "version": "1.0.1",  // Incrementar
    "android": {
      "versionCode": 2   // Sempre aumentar (2, 3, 4...)
    }
  }
}
```

### 6.2. Gerar Novo Build

```bash
eas build --platform android --profile production
```

### 6.3. Upload no Play Console

1. Vá em **"Produção"** → **"Criar nova versão"**
2. Upload do novo `.aab`
3. Adicione notas da versão
4. Publique

---

## 🚨 Solução de Problemas

### Erro: "Package name already exists"
- O `package` em `app.json` já está em uso
- Altere para algo único: `ao.gov.dnvt.mobile.v2`

### Erro: "Keystore not found"
```bash
eas credentials
# Reconfigure a keystore
```

### Build falha
```bash
# Ver logs detalhados
eas build:list
# Clique no build com erro para ver logs
```

### App rejeitado pelo Google
- Leia o email de rejeição
- Corrija os problemas apontados
- Reenvie nova versão

---

## 📊 Monitoramento Pós-Publicação

### Google Play Console
- **Estatísticas:** Instalações, desinstalações, avaliações
- **Relatórios de falhas:** Crashes e ANRs
- **Feedback:** Avaliações e comentários

### Expo Dashboard
- **Analytics:** Uso do app
- **Crashes:** Relatórios de erro
- **Updates:** Gerenciar atualizações OTA

---

## 🎯 Checklist Final

Antes de publicar, verifique:

- [ ] `app.json` configurado corretamente
- [ ] Google Maps API Key configurada
- [ ] Assets (ícone, splash) criados
- [ ] Build AAB gerado com sucesso
- [ ] Keystore salva em local seguro
- [ ] Descrição e capturas de tela preparadas
- [ ] Classificação de conteúdo completa
- [ ] Política de privacidade criada (se necessário)
- [ ] Termos de serviço criados (se necessário)
- [ ] App testado em dispositivos reais

---

## 📞 Suporte

### Expo
- [Documentação EAS Build](https://docs.expo.dev/build/introduction/)
- [Fórum Expo](https://forums.expo.dev/)

### Google Play
- [Ajuda do Play Console](https://support.google.com/googleplay/android-developer)
- [Políticas do Google Play](https://play.google.com/about/developer-content-policy/)

---

## 🔗 Links Úteis

- [Google Play Console](https://play.google.com/console)
- [Expo Dashboard](https://expo.dev/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)

---

**Última atualização:** Março 2026
**Versão do guia:** 1.0
