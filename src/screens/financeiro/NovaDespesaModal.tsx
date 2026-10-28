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
import { CategoriaDespesa, FormaPagamento } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { X, Check } from 'lucide-react-native';

interface NovaDespesaModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NovaDespesaModal: React.FC<NovaDespesaModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { keyboardHeight, maxModalHeight } = useKeyboardOffset();

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDespesa>('COMBUSTIVEL');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [submitting, setSubmitting] = useState(false);

  const handleSalvar = async () => {
    const val = parseFloat(valor.replace(',', '.'));
    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Informe a descrição da despesa.');
      return;
    }
    if (!val || val <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();
      FinanceiroService.criarDespesa({
        descricao: descricao.trim(),
        valor: val,
        categoria,
        formaPagamento,
      });

      await HapticService.success();
      setDescricao('');
      setValor('');
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao salvar despesa');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card },
            maxModalHeight ? { maxHeight: maxModalHeight } : null,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Nova Despesa de Rota</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Combustível, manutenção, alimentação, etc.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Categoria */}
            <Text style={[styles.label, { color: colors.text }]}>Categoria da Despesa:</Text>
            <View style={styles.categoryGrid}>
              {[
                { id: 'COMBUSTIVEL', label: '⛽ Combustível' },
                { id: 'MANUTENCAO', label: '🔧 Manutenção Veículo' },
                { id: 'PESSOAL', label: '🍔 Alimentação / Rua' },
                { id: 'FORNECEDOR', label: '📦 Fornecedor / Fábrica' },
                { id: 'CONTAS_FIXAS', label: '💡 Contas Fixas' },
                { id: 'OUTROS', label: '📌 Outros' },
              ].map((c) => {
                const isSel = categoria === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryBtn,
                      {
                        backgroundColor: isSel ? colors.danger : colors.surface,
                        borderColor: isSel ? colors.danger : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setCategoria(c.id as CategoriaDespesa);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryBtnText,
                        { color: isSel ? '#fff' : colors.text, fontWeight: isSel ? '800' : '600' },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Descrição */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Descrição:</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Gasolina moto entrega - Posto Shell"
              placeholderTextColor={colors.textMuted}
              value={descricao}
              onChangeText={setDescricao}
            />

            {/* Valor */}
            <Text style={[styles.label, { color: colors.text, marginTop: 10 }]}>Valor (R$):</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              value={valor}
              onChangeText={setValor}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.danger }]}
              onPress={handleSalvar}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>Lançar Despesa</Text>
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
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '48%',
  },
  categoryBtnText: {
    fontSize: 12,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
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
