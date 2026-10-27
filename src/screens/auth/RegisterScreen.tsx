import React, { useState, useRef, useEffect } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { HapticService } from '../../services/hapticService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TermosPrivacidadeModal } from '../legal/TermosPrivacidadeModal';
import {
  User as UserIcon,
  Mail,
  Lock,
  Building2,
  Phone,
  MapPin,
  ArrowRight,
  Droplets,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react-native';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { colors } = useTheme();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [nome, setNome] = useState('');
  const [nomeDistribuidora, setNomeDistribuidora] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('PB');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'termos' | 'privacidade'>('termos');

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

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim() || !nomeDistribuidora.trim()) {
      await HapticService.warning();
      Alert.alert(
        'Campos Obrigatórios',
        'Por favor, informe seu Nome, Nome da Distribuidora, E-mail e Senha.'
      );
      return;
    }

    if (senha.length < 6) {
      await HapticService.warning();
      Alert.alert('Senha Curta', 'A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.light();

      const res = await register({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        nomeDistribuidora: nomeDistribuidora.trim(),
        whatsapp: whatsapp.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
      });

      if (res.success) {
        Alert.alert(
          'Conta Criada com Sucesso! 🎉',
          'Sua distribuidora foi configurada e seu acesso já está liberado!'
        );
      } else {
        Alert.alert('Erro no Cadastro', res.error || 'Falha ao criar conta.');
      }
    } catch (err: any) {
      await HapticService.error();
      Alert.alert('Erro no Cadastro', err.message || 'Falha ao criar conta.');
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
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom:
              keyboardHeight > 0
                ? keyboardHeight + 80
                : Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 24) + 40,
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
            Cadastre sua distribuidora e comece em minutos
          </Text>

          <View style={[styles.trialBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <Sparkles size={12} color="#15803d" />
            <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '800' }}>
              EDICÃO COMERCIAL • GOOGLE PLAY
            </Text>
          </View>
        </View>

        {/* Card do Formulário */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Criar Nova Conta</Text>

          {/* Nome Completo */}
          <Text style={[styles.label, { color: colors.text }]}>Seu Nome Completo *</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserIcon size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Ex: Arthur Vitor"
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />
          </View>

          {/* Nome da Distribuidora */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Nome da sua Distribuidora *</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Ex: Distribuidora Água Belle"
              placeholderTextColor={colors.textMuted}
              value={nomeDistribuidora}
              onChangeText={setNomeDistribuidora}
            />
          </View>

          {/* WhatsApp */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>WhatsApp / Celular</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Phone size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="(83) 99999-9999"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
              onFocus={() => scrollToInput(140)}
            />
          </View>

          {/* Cidade e UF */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 2 }}>
              <Text style={[styles.label, { color: colors.text }]}>Cidade</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MapPin size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Sua cidade"
                  placeholderTextColor={colors.textMuted}
                  value={cidade}
                  onChangeText={setCidade}
                  onFocus={() => scrollToInput(220)}
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>UF</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, textAlign: 'center' }]}
                  placeholder="PB"
                  maxLength={2}
                  autoCapitalize="characters"
                  placeholderTextColor={colors.textMuted}
                  value={estado}
                  onChangeText={setEstado}
                  onFocus={() => scrollToInput(220)}
                />
              </View>
            </View>
          </View>

          {/* E-mail */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>E-mail de Acesso *</Text>
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
              onFocus={() => scrollToInput(300)}
            />
          </View>

          {/* Senha */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Senha (mínimo 6 dígitos) *</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Crie uma senha segura"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!mostrarSenha}
              value={senha}
              onChangeText={setSenha}
              onFocus={() => scrollToInput(380)}
            />
            <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={{ padding: 6 }}>
              {mostrarSenha ? (
                <EyeOff size={18} color={colors.textMuted} />
              ) : (
                <Eye size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Termos & Privacidade Disclaimer */}
          <View style={{ marginTop: 14, marginBottom: 4, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 }}>
              Ao criar sua conta, você concorda com nossos{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                onPress={() => {
                  setLegalTab('termos');
                  setShowLegalModal(true);
                }}
              >
                Termos de Uso
              </Text>
              {' '}e{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                onPress={() => {
                  setLegalTab('privacidade');
                  setShowLegalModal(true);
                }}
              >
                Política de Privacidade
              </Text>.
            </Text>
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: colors.primary }]}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.registerBtnText}>CRIAR CONTA & ENTRAR</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Rodapé: Link para Login */}
        <View style={styles.footerRow}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Já possui uma conta?</Text>
          <TouchableOpacity onPress={onNavigateToLogin}>
            <Text style={[styles.loginLink, { color: colors.primary }]}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Termos de Uso e Política de Privacidade */}
      <TermosPrivacidadeModal
        visible={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalTab}
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
    marginBottom: 20,
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
    marginBottom: 14,
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
    fontSize: 14,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
    elevation: 3,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});
