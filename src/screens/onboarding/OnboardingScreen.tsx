import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ConfigService } from '../../database/dbService';
import { HapticService } from '../../services/hapticService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Droplets,
  Flame,
  Building2,
  Phone,
  QrCode,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [nomeDistribuidora, setNomeDistribuidora] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');

  const handleFinish = async () => {
    if (!nomeDistribuidora.trim()) {
      await HapticService.warning();
      Alert.alert('Nome Obrigatório', 'Por favor, informe o nome da sua distribuidora para continuar.');
      return;
    }

    await HapticService.success();
    ConfigService.saveConfig({
      nomeDistribuidora: nomeDistribuidora.trim(),
      whatsapp: whatsapp.trim(),
      chavePix: chavePix.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
    });

    Alert.alert(
      'Tudo Pronto! 🎉',
      'Sua distribuidora foi configurada com sucesso. Os produtos de água mineral já estão prontos para você começar a vender!',
      [{ text: 'Começar Agora', onPress: onComplete }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 24) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Marca & Logo */}
        <View style={styles.brandBox}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Droplets size={36} color="#fff" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Água Gestão Pro</Text>
          <View style={[styles.trialBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <Sparkles size={13} color="#15803d" />
            <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '800' }}>
              EDICÃO COMERCIAL • GOOGLE PLAY
            </Text>
          </View>
        </View>

        {/* Card de Configuração */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.text }]}>Configure sua Distribuidora</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
            Seus dados serão impressos nos cupons térmicos e pedidos.
          </Text>

          {/* Nome Fantasia */}
          <Text style={[styles.label, { color: colors.text }]}>Nome da Distribuidora *</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Ex: Água & Gás Modelo"
              placeholderTextColor={colors.textMuted}
              value={nomeDistribuidora}
              onChangeText={setNomeDistribuidora}
            />
          </View>

          {/* WhatsApp */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>WhatsApp Comercial</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Phone size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="(11) 99999-8888"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
            />
          </View>

          {/* Chave PIX */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Chave PIX (para recebimentos)</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <QrCode size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="CNPJ, E-mail, Celular ou Aleatória"
              placeholderTextColor={colors.textMuted}
              value={chavePix}
              onChangeText={setChavePix}
            />
          </View>

          {/* Cidade e UF */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Cidade</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MapPin size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ex: São Paulo"
                  placeholderTextColor={colors.textMuted}
                  value={cidade}
                  onChangeText={setCidade}
                />
              </View>
            </View>

            <View style={{ width: 80 }}>
              <Text style={[styles.label, { color: colors.text }]}>UF</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, textAlign: 'center' }]}
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

          {/* Destaques do App */}
          <View style={styles.highlightsBox}>
            <View style={styles.highlightLine}>
              <CheckCircle2 size={15} color="#16a34a" />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                100% Offline: Não depende de internet para vender
              </Text>
            </View>
            <View style={styles.highlightLine}>
              <CheckCircle2 size={15} color="#16a34a" />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Controle ANP de validade (3 anos) de garrafões
              </Text>
            </View>
            <View style={styles.highlightLine}>
              <CheckCircle2 size={15} color="#16a34a" />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Impressão Térmica Bluetooth (58mm/80mm) pronta
              </Text>
            </View>
          </View>

          {/* Botão Concluir */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>INICIAR MEUS 14 DIAS GRÁTIS</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: {
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
    marginBottom: 8,
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
    marginTop: 6,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    fontSize: 17,
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
  highlightsBox: {
    marginTop: 16,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    borderRadius: 12,
  },
  highlightLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 18,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
