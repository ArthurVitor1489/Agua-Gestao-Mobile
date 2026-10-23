import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthService } from '../../services/authService';
import { HapticService } from '../../services/hapticService';
import {
  apiClient,
  updateApiBaseUrl,
  testServerConnection,
  DEFAULT_LAN_IP,
} from '../../api/client';
import { LocalStorage } from '../../database/localStorage';
import {
  Lock,
  Mail,
  Fingerprint,
  Droplets,
  Flame,
  ArrowRight,
  Settings,
  Server,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
} from 'lucide-react-native';

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { colors } = useTheme();
  const { login, loginWithBiometrics, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  // Configuração de Servidor / IP
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(apiClient.defaults.baseURL || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    checkBiometrics();
    LocalStorage.getServerUrl().then((saved) => {
      if (saved) setServerUrlInput(saved);
    });
  }, []);

  const checkBiometrics = async () => {
    const supported = await AuthService.isBiometricsSupported();
    setHasBiometrics(supported);

    if (supported) {
      const { hasToken } = await AuthService.checkStoredSession();
      if (hasToken) {
        loginWithBiometrics();
      }
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !senha) {
      Alert.alert('Atenção', 'Informe seu e-mail e senha.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();
      const res = await login(email, senha);
      if (!res.success) {
        if (res.error?.includes('Network') || res.error?.includes('rede')) {
          Alert.alert(
            'Erro de Conexão',
            `Não foi possível alcançar o servidor em:\n${apiClient.defaults.baseURL}\n\nToque no botão ⚙️ no topo para configurar o IP do seu computador ou testar a conexão.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Configurar IP', onPress: () => setShowConfigModal(true) },
            ]
          );
        } else {
          Alert.alert('Erro ao Acessar', res.error || 'Credenciais inválidas.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricPress = async () => {
    await HapticService.light();
    const success = await loginWithBiometrics();
    if (!success) {
      Alert.alert('Biometria', 'Não foi possível autenticar por biometria. Digite sua senha.');
    }
  };

  // Preenchimento de Demonstração
  const preencherAdmin = () => {
    HapticService.light();
    setEmail('admin@aguagestao.com.br');
    setSenha('123456');
  };

  // Teste de Conexão no Modal
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      await HapticService.light();
      const result = await testServerConnection(serverUrlInput);
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Conexão OK!' : 'Falha na conexão'),
      });
      if (result.success) {
        await HapticService.success();
      } else {
        await HapticService.error();
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServerConfig = () => {
    HapticService.medium();
    updateApiBaseUrl(serverUrlInput);
    setShowConfigModal(false);
    Alert.alert('Servidor Atualizado', `URL configurada para:\n${serverUrlInput}`);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 16),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Botão de Configuração de Servidor no Topo */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.serverSettingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              HapticService.light();
              setTestResult(null);
              setShowConfigModal(true);
            }}
            activeOpacity={0.8}
          >
            <Server size={16} color={colors.primary} />
            <Text style={[styles.serverSettingsText, { color: colors.textMuted }]} numberOfLines={1}>
              {apiClient.defaults.baseURL}
            </Text>
            <Settings size={15} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logotipo & Marca */}
        <View style={styles.brandBox}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Droplets size={36} color="#fff" />
              <Flame size={24} color="#f97316" style={{ marginLeft: -8, marginTop: 12 }} />
            </View>
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Água Gestão</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
            SaaS Distribuidoras de Água Mineral & Gás
          </Text>
        </View>

        {/* Card de Login */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.text }]}>Acesso ao Aplicativo</Text>

          {/* E-mail */}
          <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Mail size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Senha */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Senha</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Lock size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={submitting || isLoading}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Entrar no Sistema</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Botão Biometria */}
          {hasBiometrics && (
            <TouchableOpacity
              style={[styles.bioBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleBiometricPress}
              activeOpacity={0.7}
            >
              <Fingerprint size={22} color={colors.primary} />
              <Text style={[styles.bioBtnText, { color: colors.text }]}>Entrar com Biometria</Text>
            </TouchableOpacity>
          )}

          {/* Preenchimento Rápido Demo */}
          <TouchableOpacity style={styles.demoFillBtn} onPress={preencherAdmin}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
              💡 Preencher credenciais de demonstração (Admin)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chamada para Criar Nova Conta (14 Dias Grátis) */}
        {onNavigateToRegister && (
          <TouchableOpacity
            style={[
              styles.createAccountBtn,
              { backgroundColor: colors.card, borderColor: colors.primary },
            ]}
            onPress={() => {
              HapticService.light();
              onNavigateToRegister();
            }}
            activeOpacity={0.8}
          >
            <Sparkles size={16} color={colors.primary} />
            <Text style={[styles.createAccountBtnText, { color: colors.primary }]}>
              Criar Nova Distribuidora (14 Dias Grátis)
            </Text>
          </TouchableOpacity>
        )}

        {/* Rodapé Google Play Store Compliance */}
        <View style={styles.footer}>
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>
            Água Gestão SaaS Mobile v1.0.0 • Google Play Edition
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 }}>
            Operação Online / Offline-First Resiliente
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Configuração de Servidor & IP da API */}
      <Modal visible={showConfigModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Server size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Servidor & IP da API</Text>
              </View>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16 }}>
                Se você estiver rodando o aplicativo no seu celular físico conectado no mesmo Wi-Fi do computador, selecione o IP local da sua máquina:
              </Text>

              <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>URL Base da API</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Atalhos Rápidos */}
              <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Atalhos Pré-definidos:</Text>
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                  onPress={() => setServerUrlInput('https://aguagestao-api.loca.lt/api')}
                >
                  <Text style={[styles.presetTitle, { color: colors.primary }]}>⚡ Conexão Segura HTTPS (Recomendado - Sem Firewall)</Text>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>https://aguagestao-api.loca.lt/api</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setServerUrlInput(`http://${DEFAULT_LAN_IP}:3000/api`)}
                >
                  <Text style={[styles.presetTitle, { color: colors.text }]}>🏠 Wi-Fi Direto do Computador</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>http://{DEFAULT_LAN_IP}:3000/api</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setServerUrlInput('http://10.0.2.2:3000/api')}
                >
                  <Text style={[styles.presetTitle, { color: colors.text }]}>💻 Emulador Android (Android Studio)</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>http://10.0.2.2:3000/api</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setServerUrlInput('http://localhost:3000/api')}
                >
                  <Text style={[styles.presetTitle, { color: colors.text }]}>🌐 Navegador Web / Localhost</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>http://localhost:3000/api</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setServerUrlInput('https://aguagestao.com.br/api')}
                >
                  <Text style={[styles.presetTitle, { color: colors.text }]}>☁️ Servidor Oficial de Produção</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>https://aguagestao.com.br/api</Text>
                </TouchableOpacity>
              </View>

              {/* Resultado do Teste de Conexão */}
              {testResult && (
                <View
                  style={[
                    styles.testResultBox,
                    {
                      backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
                      borderColor: testResult.success ? '#15803d' : '#b91c1c',
                    },
                  ]}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={18} color="#15803d" />
                  ) : (
                    <XCircle size={18} color="#b91c1c" />
                  )}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: '700',
                      color: testResult.success ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {testResult.message}
                  </Text>
                </View>
              )}

              {/* Botão de Testar */}
              <TouchableOpacity
                style={[styles.testBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.testBtnText, { color: colors.primary }]}>🧪 Testar Conexão Agora</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.saveConfigBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveServerConfig}
              >
                <Text style={styles.saveConfigBtnText}>Salvar e Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    marginBottom: 16,
  },
  serverSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: '90%',
  },
  serverSettingsText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 18,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  bioBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoFillBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 6,
  },
  createAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 16,
  },
  createAccountBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  presetBtn: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 14,
  },
  testBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 12,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveConfigBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveConfigBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
