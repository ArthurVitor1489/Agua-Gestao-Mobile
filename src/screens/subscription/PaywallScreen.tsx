import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { HapticService } from '../../services/hapticService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  Printer,
  Calendar,
  MessageCircle,
  TrendingUp,
  X,
  Lock,
} from 'lucide-react-native';

interface PaywallScreenProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ visible = true, onClose }) => {
  const { colors, isDark } = useTheme();
  const { subscribeWithGooglePlay, loading, hasAccess, daysRemaining } = useSubscription();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'ANUAL' | 'MENSAL'>('ANUAL');

  const handleSubscribe = async () => {
    await HapticService.medium();
    const res = await subscribeWithGooglePlay(selectedPlan);
    if (res.success) {
      Alert.alert('Parabéns! 🎉', res.message, [
        {
          text: 'Continuar',
          onPress: () => {
            if (onClose) onClose();
          },
        },
      ]);
    } else {
      Alert.alert('Aviso', res.message);
    }
  };

  const content = (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Botão Fechar (apenas se ainda tem acesso) */}
      {hasAccess && onClose && (
        <TouchableOpacity
          style={[styles.closeBtn, { top: Math.max(insets.top, 16) + 8 }]}
          onPress={() => {
            HapticService.light();
            onClose();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={22} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 24) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge Topo */}
        <View style={styles.topBadgeRow}>
          <View style={[styles.proBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.proBadgeText, { color: colors.primary }]}>GOOGLE PLAY ASSINATURAS</Text>
          </View>
        </View>

        {/* Título Principal */}
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          Controle Total da sua Distribuidora na Palma da Mão
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          {hasAccess && daysRemaining !== null
            ? `Você está no teste grátis (${daysRemaining} dias restantes). Garanta seu desconto antes que termine!`
            : 'Seu período de teste de 14 dias expirou. Assine agora para continuar usando sem interrupções.'}
        </Text>

        {/* Lista de Recursos Premium */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Zap size={18} color="#0284c7" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>PDV Ultrarrápido & Offline</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                Lance vendas na rua mesmo sem internet. Sincronização automática.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#fef3c7' }]}>
              <Calendar size={18} color="#d97706" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Auditoria e Lotes ANP</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                Controle automático dos 3 anos de validade de botijões e galões de água.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#dcfce7' }]}>
              <MessageCircle size={18} color="#16a34a" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Recompra Inteligente no WhatsApp</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                Previsão de consumo dos clientes para vender antes da concorrência.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Printer size={18} color="#9333ea" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Impressão Térmica Bluetooth</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
                Emita recibos e comandas ESC/POS de 58mm e 80mm com 1 toque.
              </Text>
            </View>
          </View>
        </View>

        {/* Seleção de Planos */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Escolha o melhor plano:</Text>

        {/* Card Plano Anual */}
        <TouchableOpacity
          style={[
            styles.planCard,
            {
              backgroundColor: colors.card,
              borderColor: selectedPlan === 'ANUAL' ? colors.primary : colors.border,
              borderWidth: selectedPlan === 'ANUAL' ? 2 : 1,
            },
          ]}
          onPress={() => {
            HapticService.light();
            setSelectedPlan('ANUAL');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>MAIS ESCOLHIDO • ECONOMIZE 27%</Text>
          </View>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={[styles.planName, { color: colors.text }]}>Plano Anual</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                R$ 349,90 cobrados anualmente
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPriceMonth, { color: colors.primary }]}>R$ 29,15</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>/mês</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card Plano Mensal */}
        <TouchableOpacity
          style={[
            styles.planCard,
            {
              backgroundColor: colors.card,
              borderColor: selectedPlan === 'MENSAL' ? colors.primary : colors.border,
              borderWidth: selectedPlan === 'MENSAL' ? 2 : 1,
              marginTop: 12,
            },
          ]}
          onPress={() => {
            HapticService.light();
            setSelectedPlan('MENSAL');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.planCardHeader}>
            <View>
              <Text style={[styles.planName, { color: colors.text }]}>Plano Mensal</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                Cancele quando quiser
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPriceMonth, { color: colors.text }]}>R$ 39,90</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>/mês</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Botão de Assinatura Google Play */}
        <TouchableOpacity
          style={[styles.subscribeBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubscribe}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="#fff" />
              <Text style={styles.subscribeBtnText}>
                ASSINAR COM GOOGLE PLAY • {selectedPlan === 'ANUAL' ? 'R$ 349,90/ano' : 'R$ 39,90/mês'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Rodapé de Confiança e Compliance Google Play */}
        <View style={styles.trustBox}>
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
            🔒 Cobrança gerenciada de forma transparente pela Google Play Store. Você pode gerenciar ou cancelar sua assinatura a qualquer momento no app da Play Store sem nenhuma taxa de cancelamento.
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  if (onClose) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBadgeRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  featuresCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  featureDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  planCard: {
    borderRadius: 18,
    padding: 16,
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  saveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
  },
  planPriceMonth: {
    fontSize: 20,
    fontWeight: '900',
  },
  subscribeBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  trustBox: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
});
