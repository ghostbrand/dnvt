# 📱 Permitir Exibição em Apps de Acesso Remoto

## 🎯 Problema Resolvido

Por padrão, alguns apps Android bloqueiam a captura de tela e exibição em aplicativos de acesso remoto (TeamViewer, AnyDesk, Chrome Remote Desktop, etc.) usando a flag `FLAG_SECURE`.

**Solução implementada:** Desabilitamos essa flag para permitir que o app DNVT Mobile seja exibido normalmente em apps de acesso remoto.

---

## ✅ Modificação Realizada

### **Arquivo:** `android/app/src/main/java/ao/gov/dnvt/mobile/MainActivity.kt`

**Código adicionado:**

```kotlin
import android.view.WindowManager

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    
    // Permitir captura de tela e exibição em apps de acesso remoto
    // Remove FLAG_SECURE para permitir TeamViewer, AnyDesk, etc
    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
  }
}
```

---

## 🔄 Como Gerar Novo APK com a Mudança

### **Opção 1: Build com EAS (Recomendado)**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\mobile

# Incrementar versionCode em app.json antes do build
# "versionCode": 2  (era 1)

# Gerar novo APK de preview para testes
npm run build:android:preview

# OU gerar AAB de produção
npm run build:android:production
```

**Tempo:** 10-20 minutos (build na nuvem)

---

### **Opção 2: Build Local (Mais Rápido para Testes)**

```bash
cd C:\Users\jaime\Documentos\GitHub\dnvt\mobile

# Gerar APK localmente
npx expo run:android --variant release

# OU usar Gradle diretamente
cd android
./gradlew assembleRelease

# APK gerado em:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Apps de Acesso Remoto Compatíveis

Agora o DNVT Mobile funcionará normalmente com:

- ✅ **TeamViewer**
- ✅ **AnyDesk**
- ✅ **Chrome Remote Desktop**
- ✅ **Microsoft Remote Desktop**
- ✅ **VNC Viewer**
- ✅ **Splashtop**
- ✅ Qualquer app de compartilhamento de tela

---

## 🔐 Considerações de Segurança

### **Por que FLAG_SECURE existe?**

A flag `FLAG_SECURE` é usada para:
- Bloquear capturas de tela
- Impedir gravação de tela
- Proteger dados sensíveis (apps bancários, senhas)

### **É seguro desabilitar?**

Para o DNVT Mobile: **SIM**
- ✅ Não lida com dados bancários ou senhas críticas
- ✅ Informações de acidentes são públicas/governamentais
- ✅ Facilita suporte remoto e demonstrações
- ✅ Permite treinamento e apresentações

### **Quando NÃO desabilitar:**

❌ Apps bancários
❌ Apps de pagamento
❌ Apps com dados médicos sensíveis
❌ Apps com informações pessoais críticas

---

## 🧪 Como Testar

### **1. Instalar o novo APK:**

```bash
# Via USB
adb install -r app-release.apk

# Ou envie o APK para o celular e instale manualmente
```

### **2. Testar com app de acesso remoto:**

1. Instale TeamViewer ou AnyDesk no celular
2. Conecte de outro dispositivo
3. Abra o DNVT Mobile
4. **Resultado esperado:** App deve ser visível na tela remota

### **3. Testar captura de tela:**

1. Abra o DNVT Mobile
2. Pressione **Power + Volume Down** (captura de tela)
3. **Resultado esperado:** Screenshot deve funcionar normalmente

---

## 🔄 Reverter a Mudança (Se Necessário)

Se precisar bloquear novamente:

```kotlin
// Em MainActivity.kt, substitua:
window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)

// Por:
window.setFlags(
    WindowManager.LayoutParams.FLAG_SECURE,
    WindowManager.LayoutParams.FLAG_SECURE
)
```

Depois gere novo build.

---

## 📋 Checklist

Antes de publicar no Play Store:

- [ ] Testar acesso remoto funciona
- [ ] Testar captura de tela funciona
- [ ] Incrementar `versionCode` em `app.json`
- [ ] Gerar novo build AAB
- [ ] Testar em dispositivo real
- [ ] Publicar atualização no Play Store

---

## 🔗 Referências

- [Android FLAG_SECURE Documentation](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
- [Expo Build Documentation](https://docs.expo.dev/build/introduction/)

---

**Última atualização:** Março 2026
