import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const handleSubmit = async () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, senha);
      } else {
        if (!nome) {
          Alert.alert('Erro', 'Preencha o nome');
          return;
        }
        await register(nome, email, senha, telefone);
      }
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>🚗 DNVT</Text>
        <Text style={styles.subtitle}>Sistema de Acidentes de Trânsito</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#94A3B8"
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              placeholderTextColor="#94A3B8"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#94A3B8"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Entrar' : 'Criar Conta'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Angola © 2026 - DNVT</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 40
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff'
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0'
  },
  tabActive: {
    borderBottomColor: '#0F172A'
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#0F172A'
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#0F172A'
  },
  button: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  footer: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 12
  }
});
