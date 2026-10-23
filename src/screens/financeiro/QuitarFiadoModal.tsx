import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FinanceiroService } from '../../database/dbService';
import { Fiado, FormaPagamento } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { X, Check, DollarSign } from 'lucide-react-native';

interface QuitarFiadoModalProps {
  visible: boolean;
  fiado: Fiado | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuitarFiadoModal: React.FC<QuitarFiadoModalProps> = ({
  visible,
  fiado,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  const [valorPago, setValorPago] = useState(fiado?.saldo ? fiado.saldo.toFixed(2) : '');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (fiado) {
      setValorPago(fiado.saldo.toFixed(2));
    }
  }, [fiado]);

  if (!fiado) return null;

  const handleSalvar = async () => {
    const val = parseFloat(valorPago.replace(',', '.'));
    if (!val || val <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    if (val > fiado.saldo) {
      Alert.alert('Atenção', `O valor não pode ser maior que o saldo devedor (R$ ${fiado.saldo.toFixed(2)}).`);
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();
      FinanceiroService.quitarFiado(fiado.id, val);
      await HapticService.success();
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao registrar quitação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Quitar / Amortizar Fiado</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Cliente: {fiado.cliente?.nome || 'Consumidor'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Resumo do Saldo */}
            <View style={[styles.saldoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>SALDO DEVEDOR ATUAL</Text>
              <Text style={[styles.saldoNum, { color: colors.danger }]}>
                R$ {fiado.saldo.toFixed(2)}
              </Text>
            </View>

            {/* Valor a pagar */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              Valor da Quitação (R$):
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              keyboardType="numeric"
              placeholder="0,00"
              value={valorPago}
              onChangeText={setValorPago}
            />

            {/* Meio de pagamento */}
            <Text style={[styles.label, { color: colors.text, marginTop: 10 }]}>
              Forma de Pagamento:
            </Text>
            <View style={styles.paymentRow}>
              {(['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO'] as FormaPagamento[]).map((forma) => {
                const isSel = formaPagamento === forma;
                return (
                  <TouchableOpacity
                    key={forma}
                    style={[
                      styles.payBtn,
                      {
                        backgroundColor: isSel ? colors.primary : colors.surface,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setFormaPagamento(forma);
                    }}
                  >
                    <Text
                      style={[
                        styles.payText,
                        { color: isSel ? '#fff' : colors.text, fontWeight: isSel ? '800' : '600' },
                      ]}
                    >
                      {forma}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Observações:</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Pago pelo WhatsApp com comprovante"
              placeholderTextColor={colors.textMuted}
              value={observacoes}
              onChangeText={setObservacoes}
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.success }]}
              onPress={handleSalvar}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirmar Recebimento</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  saldoBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  saldoNum: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: 'bold',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  payText: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
