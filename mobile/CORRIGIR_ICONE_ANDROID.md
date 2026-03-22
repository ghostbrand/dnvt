# 🔧 Corrigir Ícone do App Android Instalado

## Problema
O ícone do app não aparece corretamente após instalação no Android.

## Causa Provável
- **Dimensões incorretas** dos ficheiros `icon.png` ou `adaptive-icon.png`
- **Falta de configuração** de fallback icon no `app.json`
- **Cache do Android** não atualizado após reinstalação

## Solução Completa

### 1️⃣ Verificar Dimensões dos Ícones

Os ícones precisam ter dimensões específicas:

- **`icon.png`**: 1024x1024 px (ícone principal)
- **`adaptive-icon.png`**: 1024x1024 px (foreground do adaptive icon)
- **`notification-icon.png`**: 96x96 px (ícone de notificação)

### 2️⃣ Gerar Ícones Corretos

**Opção A: Usar ferramenta online**
1. Acede a https://easyappicon.com/ ou https://appicon.co/
2. Faz upload da tua imagem/logo (mínimo 1024x1024)
3. Seleciona "Android" e gera os ícones
4. Substitui os ficheiros em `mobile/assets/`

**Opção B: Usar Expo Icon Generator**
```bash
npx expo install expo-asset
npx @expo/image-utils generate-icons --input ./path/to/your/logo.png --output ./assets
```

### 3️⃣ Configuração Correta no app.json

Já corrigi o `app.json` para incluir:

```json
"android": {
  "icon": "./assets/icon.png",           // ← ADICIONADO (fallback)
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#0F172A"
  },
  "versionCode": 3                        // ← INCREMENTADO
}
```

### 4️⃣ Rebuild do App

Depois de corrigir os ícones, faz um novo build:

```bash
# Preview APK
npm run build:android:preview

# Ou Production AAB
npm run build:android:production
```

### 5️⃣ Limpar Cache do Android (se necessário)

Se reinstalares e o ícone continuar errado:

1. **Desinstala completamente** o app antigo
2. **Reinicia o dispositivo** Android
3. **Instala o novo APK/AAB**

Ou via ADB:
```bash
adb uninstall ao.gov.dnvt.mobile
adb install path/to/new.apk
```

## Checklist Rápido

- [ ] `icon.png` tem 1024x1024 px
- [ ] `adaptive-icon.png` tem 1024x1024 px
- [ ] `app.json` tem `android.icon` configurado
- [ ] `versionCode` foi incrementado (agora é 3)
- [ ] Fiz novo build com EAS
- [ ] Desinstalei app antigo antes de instalar novo
- [ ] Reiniciei o dispositivo se necessário

## Dicas Importantes

### Adaptive Icon
O `adaptive-icon.png` deve ter:
- **Área segura**: círculo central de ~66% do tamanho total
- **Fundo transparente** ou cor sólida
- **Logo/ícone centrado** na área segura

### Teste Local
Para testar rapidamente sem build completo:
```bash
npx expo start --android
```
Mas o ícone final só aparece correto no **APK/AAB instalado**.

## Resultado Esperado

Após seguir estes passos, o ícone deve aparecer:
- ✅ No launcher do Android
- ✅ Na gaveta de apps
- ✅ Nas notificações
- ✅ Nas configurações do sistema

---

**Nota**: Se os ficheiros `icon.png` e `adaptive-icon.png` atuais tiverem dimensões muito pequenas (como 5KB sugere), precisas de regenerá-los com as dimensões corretas (1024x1024).
