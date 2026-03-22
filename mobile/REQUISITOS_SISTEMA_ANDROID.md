# 📱 Requisitos de Sistema - DNVT Mobile (Android)

## 📋 Requisitos Mínimos de Hardware

### **Android Versão Mínima:**
- **Android 6.0 (Marshmallow)** ou superior
- **API Level:** 23+

### **Processador:**
- **Mínimo:** Quad-core 1.3 GHz
- **Recomendado:** Octa-core 1.8 GHz ou superior

### **Memória RAM:**
- **Mínimo:** 2 GB RAM
- **Recomendado:** 3 GB RAM ou superior
- **Ideal:** 4 GB RAM ou mais

### **Armazenamento:**
- **Espaço livre necessário:** 150-200 MB
- **Tipo:** Interno (não pode ser instalado em SD card)

### **Tela:**
- **Resolução mínima:** 720 x 1280 pixels (HD)
- **Densidade:** ~300 DPI ou superior
- **Tamanho:** 4.5" ou maior

### **Conectividade:**
- **Internet:** Wi-Fi ou dados móveis (3G/4G/5G)
- **GPS:** Obrigatório (para localização de acidentes)
- **Bluetooth:** Opcional

---

## 🔧 Especificações Técnicas do App

### **Configuração Android:**

```gradle
minSdkVersion: 23      // Android 6.0 (Marshmallow)
targetSdkVersion: 35   // Android 15 (mais recente)
compileSdkVersion: 35  // Android 15
```

### **Arquiteturas Suportadas:**
- ✅ **armeabi-v7a** (32-bit ARM) - Dispositivos mais antigos
- ✅ **arm64-v8a** (64-bit ARM) - Dispositivos modernos
- ✅ **x86** (32-bit Intel) - Emuladores
- ✅ **x86_64** (64-bit Intel) - Emuladores modernos

### **Engine JavaScript:**
- **Hermes** (otimizado para React Native)
- Melhor performance e menor uso de memória

---

## 📊 Recursos Necessários

### **Permissões Obrigatórias:**
- ✅ **Localização (GPS):**
  - `ACCESS_FINE_LOCATION` - Localização precisa
  - `ACCESS_COARSE_LOCATION` - Localização aproximada
  - `ACCESS_BACKGROUND_LOCATION` - Localização em segundo plano

- ✅ **Câmera:**
  - `CAMERA` - Para tirar fotos de acidentes

- ✅ **Armazenamento:**
  - `READ_EXTERNAL_STORAGE` - Ler fotos
  - `WRITE_EXTERNAL_STORAGE` - Salvar fotos

- ✅ **Notificações:**
  - Push notifications para alertas de acidentes

### **Sensores Necessários:**
- 📍 **GPS** - Obrigatório
- 📷 **Câmera** - Obrigatório
- 🌐 **Internet** - Obrigatório

---

## 🎯 Dispositivos Compatíveis

### **✅ Totalmente Compatível:**

**Marcas Populares em Angola:**
- **Samsung:** Galaxy A, Galaxy S, Galaxy M (2018+)
- **Xiaomi:** Redmi, Mi, Poco (2018+)
- **Huawei:** P Series, Mate Series, Y Series (2018+)
- **Tecno:** Spark, Camon, Phantom (2019+)
- **Infinix:** Hot, Note, Zero (2019+)
- **Oppo:** A Series, Reno (2018+)
- **Realme:** C Series, Narzo (2019+)

**Exemplos de Modelos:**
- Samsung Galaxy A10, A20, A30, A50 (2019+)
- Xiaomi Redmi 8, 9, 10, Note 8, Note 9
- Huawei Y6, Y7, Y9, P20, P30
- Tecno Spark 4, 5, 6, 7
- Infinix Hot 8, 9, 10

### **⚠️ Compatível com Limitações:**

**Dispositivos Antigos (2016-2018):**
- Pode ter performance reduzida
- Mapas podem carregar mais lentamente
- Câmera pode ter qualidade inferior

**Dispositivos com 1-2 GB RAM:**
- App pode fechar em segundo plano
- Multitarefa limitada
- Recomenda-se fechar outros apps

### **❌ Não Compatível:**

- Android 5.1 (Lollipop) ou inferior
- Dispositivos sem GPS
- Dispositivos sem câmera
- Tablets sem GPS integrado

---

## 📈 Consumo de Recursos

### **Uso de Dados Móveis:**
- **Uso leve:** ~5-10 MB/dia (apenas consultas)
- **Uso moderado:** ~20-30 MB/dia (reportar acidentes)
- **Uso intenso:** ~50-100 MB/dia (muitas fotos)

**Dica:** Use Wi-Fi para fazer upload de fotos para economizar dados.

### **Uso de Bateria:**
- **Standby:** ~2-3% por hora
- **Uso ativo:** ~8-12% por hora
- **GPS ativo:** +5-10% por hora

**Dica:** Desative localização em segundo plano se não precisar de alertas.

### **Espaço de Armazenamento:**
- **App instalado:** ~80-100 MB
- **Cache e dados:** ~20-50 MB
- **Fotos temporárias:** ~10-30 MB

**Total estimado:** 150-200 MB

---

## 🔋 Otimizações Implementadas

### **Performance:**
- ✅ Hermes Engine (JavaScript otimizado)
- ✅ New Architecture (React Native moderna)
- ✅ Compressão de imagens antes do upload
- ✅ Cache de dados para uso offline
- ✅ Lazy loading de mapas

### **Bateria:**
- ✅ Localização apenas quando necessário
- ✅ Notificações otimizadas
- ✅ Sincronização em background controlada

### **Dados:**
- ✅ Compressão de imagens (JPEG 80% qualidade)
- ✅ Cache de mapas
- ✅ Sincronização incremental

---

## 🧪 Como Verificar Compatibilidade

### **Método 1: Verificar Versão do Android**

1. Abra **Configurações**
2. Vá em **Sobre o telefone**
3. Procure **Versão do Android**
4. Verifique se é **6.0 ou superior** ✅

### **Método 2: Verificar RAM**

1. Abra **Configurações**
2. Vá em **Sobre o telefone** → **Memória**
3. Verifique **RAM total**
4. Ideal: **3 GB ou mais** ✅

### **Método 3: Verificar Espaço Livre**

1. Abra **Configurações**
2. Vá em **Armazenamento**
3. Verifique **Espaço disponível**
4. Necessário: **200 MB livres** ✅

---

## 📱 Dispositivos Recomendados (Custo-Benefício)

### **Entrada (Budget):**
- **Xiaomi Redmi 10** - ~$120
- **Samsung Galaxy A04** - ~$130
- **Tecno Spark 10** - ~$100
- **Infinix Hot 12** - ~$110

### **Intermediário:**
- **Xiaomi Redmi Note 12** - ~$180
- **Samsung Galaxy A24** - ~$200
- **Realme 10** - ~$170
- **Oppo A78** - ~$190

### **Premium:**
- **Samsung Galaxy A54** - ~$350
- **Xiaomi Poco X5 Pro** - ~$300
- **Realme GT Neo 3** - ~$320

---

## ⚙️ Configurações Recomendadas

### **Para Melhor Performance:**

1. **Ativar "Modo de economia de dados"** (se disponível)
2. **Limpar cache regularmente:**
   - Configurações → Apps → DNVT Mobile → Armazenamento → Limpar cache
3. **Desativar animações:**
   - Configurações → Opções do desenvolvedor → Escala de animação → 0.5x
4. **Fechar apps em segundo plano**

### **Para Economizar Bateria:**

1. **Desativar localização em segundo plano:**
   - Configurações → Apps → DNVT Mobile → Permissões → Localização → "Apenas durante uso"
2. **Reduzir brilho da tela**
3. **Ativar modo de economia de energia**

### **Para Economizar Dados:**

1. **Usar Wi-Fi sempre que possível**
2. **Desativar sincronização automática:**
   - Configurações do app → Sincronização → Manual
3. **Comprimir fotos antes de enviar**

---

## 🔍 Solução de Problemas

### **App está lento:**
- ✅ Limpar cache do app
- ✅ Reiniciar dispositivo
- ✅ Fechar outros apps
- ✅ Verificar espaço livre (mínimo 500 MB)

### **GPS não funciona:**
- ✅ Ativar localização nas configurações
- ✅ Dar permissão de localização ao app
- ✅ Usar ao ar livre (melhor sinal GPS)
- ✅ Reiniciar dispositivo

### **Fotos não carregam:**
- ✅ Verificar conexão com internet
- ✅ Dar permissão de câmera e armazenamento
- ✅ Verificar espaço livre
- ✅ Tentar com Wi-Fi

### **App fecha sozinho:**
- ✅ Dispositivo com pouca RAM (fechar outros apps)
- ✅ Atualizar para versão mais recente
- ✅ Limpar cache
- ✅ Reinstalar app

---

## 📊 Comparação com Apps Similares

| Recurso | DNVT Mobile | Waze | Google Maps |
|---------|-------------|------|-------------|
| **Android mínimo** | 6.0 | 5.0 | 6.0 |
| **RAM mínima** | 2 GB | 1 GB | 2 GB |
| **Tamanho do app** | ~100 MB | ~150 MB | ~200 MB |
| **Uso de dados** | Baixo | Médio | Alto |
| **Uso de bateria** | Baixo | Médio | Alto |

---

## ✅ Checklist de Compatibilidade

Antes de instalar, verifique:

- [ ] Android 6.0 ou superior
- [ ] Mínimo 2 GB de RAM (3 GB recomendado)
- [ ] 200 MB de espaço livre
- [ ] GPS funcional
- [ ] Câmera funcional
- [ ] Conexão com internet (Wi-Fi ou dados móveis)
- [ ] Permissões de localização ativadas
- [ ] Permissões de câmera ativadas

---

## 📞 Suporte

Se o app não funcionar no seu dispositivo:

1. Verifique todos os requisitos acima
2. Atualize o Android para a versão mais recente disponível
3. Entre em contato com suporte técnico
4. Considere upgrade de dispositivo se muito antigo

---

**Última atualização:** Março 2026  
**Versão do app:** 1.0.0  
**Plataforma:** Android 6.0+
