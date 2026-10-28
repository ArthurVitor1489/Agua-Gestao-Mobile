import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthService } from '../../services/authService';
import { HapticService } from '../../services/hapticService';
import { SuperAdminModal } from '../admin/SuperAdminModal';
import {
  Lock,
  Mail,
  Droplets,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react-native';

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { colors } = useTheme();
  const { login, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);

  // Easter egg: 5 toques seguidos para abrir Painel Super Admin
  const adminTapCountRef = useRef(0);
  const lastAdminTapRef = useRef(0);

  const handleAdminEasterEgg = () => {
    const now = Date.now();
    if (now - lastAdminTapRef.current > 2000) {
      adminTapCountRef.current = 0;
    }
    lastAdminTapRef.current = now;
    adminTapCountRef.current += 1;

    HapticService.light();

    if (adminTapCountRef.current >= 5) {
      adminTapCountRef.current = 0;
      HapticService.success();
      setShowSuperAdminModal(true);
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  const handleLogin = async () => {
    if (!email.trim() || !senha) {
      Alert.alert('Atenção', 'Informe seu e-mail e senha de acesso.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();
      const res = await login(email.trim(), senha);
      if (!res.success) {
        Alert.alert('Falha no Login', res.error || 'E-mail ou senha incorretos.');
      }
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom:
              keyboardHeight > 0
                ? keyboardHeight + 60
                : Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 24) + 30,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* Marca & Logo */}
        <View style={styles.brandBox}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Droplets size={36} color="#fff" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Água Gestão Pro</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
            Gestão Inteligente para Distribuidoras de Água
          </Text>
        </View>

        {/* Card de Login */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Acesse sua Conta</Text>

          {/* Campo E-mail */}
          <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Campo Senha */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Senha</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Sua senha secreta"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!mostrarSenha}
              value={senha}
              onChangeText={setSenha}
              onFocus={() => scrollToInput(150)}
            />
            <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={{ padding: 6 }}>
              {mostrarSenha ? (
                <EyeOff size={18} color={colors.textMuted} />
              ) : (
                <Eye size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={submitting || isLoading}
            activeOpacity={0.8}
          >
            {submitting || isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>ENTRAR</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Rodapé: Link para Cadastro */}
        {onNavigateToRegister && (
          <View style={styles.footerRow}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Ainda não tem uma conta?</Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                Criar Conta Grátis (14 Dias)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Versão do App (Toque 5x para abrir Painel Admin) */}
        <TouchableOpacity
          style={styles.versionRow}
          onPress={handleAdminEasterEgg}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
            Versão 1.0.0 Pro
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Super Admin Master */}
      <SuperAdminModal
        visible={showSuperAdminModal}
        onClose={() => setShowSuperAdminModal(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
    elevation: 3,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  versionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingVertical: 8,
  },
});
