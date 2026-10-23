import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AuthApi } from '../../api/authApi';
import { HapticService } from '../../services/hapticService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User as UserIcon,
  Mail,
  Lock,
  Building2,
  Phone,
  MapPin,
  ArrowRight,
  Droplets,
  Flame,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { colors } = useTheme();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeDistribuidora, setNomeDistribuidora] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim() || !nomeDistribuidora.trim()) {
      await HapticService.warning();
      Alert.alert('Campos Obrigatórios', 'Por favor, informe seu Nome, E-mail, Senha e o Nome da sua Distribuidora.');
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
          'Bem-vindo ao Água Gestão! 🎉',
          'Sua distribuidora foi criada com sucesso com 14 dias de teste grátis e catálogo pré-configurado!'
        );
      } else {
        Alert.alert('Erro no Cadastro', res.error || 'Falha ao criar conta.');
      }
    } catch (err: any) {
      await HapticService.error();
      const msg = err.response?.data?.error || err.message || 'Falha ao criar conta.';
      Alert.alert('Erro no Cadastro', msg);
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
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 10,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 16) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho Marca */}
        <View style={styles.brandBox}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Droplets size={32} color="#fff" />
              <Flame size={20} color="#f97316" style={{ marginLeft: -6, marginTop: 10 }} />
            </View>
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Água Gestão</Text>
          <View style={[styles.trialBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <Sparkles size={13} color="#15803d" />
            <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '800' }}>
              14 DIAS GRÁTIS • SEM CARTÃO
            </Text>
          </View>
        </View>

        {/* Card de Cadastro */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.text }]}>Cadastre sua Distribuidora</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
            Crie sua conta para gerenciar água, gás, estoques ANP e clientes.
          </Text>

          {/* Nome do Responsável */}
          <Text style={[styles.label, { color: colors.text }]}>Seu Nome Completo *</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserIcon size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Ex: Carlos Silva"
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />
          </View>

          {/* Nome da Distribuidora */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Nome da Distribuidora *</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Ex: Distribuidora Água & Gás Modelo"
              placeholderTextColor={colors.textMuted}
              value={nomeDistribuidora}
              onChangeText={setNomeDistribuidora}
            />
          </View>

          {/* E-mail */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>E-mail de Acesso *</Text>
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
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Criar Senha (mínimo 6 dígitos) *</Text>
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

          {/* WhatsApp e Cidade */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>WhatsApp Comercial</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Phone size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="(11) 99999-8888"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                />
              </View>
            </View>

            <View style={{ width: 90 }}>
              <Text style={[styles.label, { color: colors.text }]}>UF</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MapPin size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="SP"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={2}
                  value={estado}
                  onChangeText={setEstado}
                />
              </View>
            </View>
          </View>

          {/* Vantagens Inclusas */}
          <View style={styles.featuresIncluded}>
            <View style={styles.featureLine}>
              <CheckCircle2 size={14} color="#16a34a" />
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                Produtos padrão inclusos (Galão 20L, Botijão P13)
              </Text>
            </View>
            <View style={styles.featureLine}>
              <CheckCircle2 size={14} color="#16a34a" />
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                14 dias de teste grátis com tudo liberado
              </Text>
            </View>
          </View>

          {/* Botão Criar Conta */}
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
                <Text style={styles.registerBtnText}>Criar Minha Conta (14 Dias Grátis)</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Alternar para Login */}
        <TouchableOpacity style={styles.loginLinkBox} onPress={onNavigateToLogin} activeOpacity={0.7}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Já possui cadastro?{' '}
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Fazer Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  featuresIncluded: {
    marginTop: 16,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 10,
    borderRadius: 10,
  },
  featureLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 18,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  loginLinkBox: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
});
