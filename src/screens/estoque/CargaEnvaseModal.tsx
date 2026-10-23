import React, { useState, useEffect } from 'react';
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
import { EstoqueService } from '../../database/dbService';
import { Produto } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { X, Truck, Check } from 'lucide-react-native';

interface CargaEnvaseModalProps {
  visible: boolean;
  produtos: Produto[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CargaEnvaseModal: React.FC<CargaEnvaseModalProps> = ({
  visible,
  produtos,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  // Produtos que usam vasilhame retornável (Galão 20L)
  const produtosRetornaveis = produtos.filter(
    (p) => p.categoria === 'AGUA_20L' || p.nome.includes('20L')
  );

  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [qtdCheios, setQtdCheios] = useState('');
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && produtosRetornaveis.length > 0 && !selectedProdutoId) {
      setSelectedProdutoId(produtosRetornaveis[0].id);
    }
  }, [visible, produtosRetornaveis]);

  const produtoSelecionado = produtos.find((p) => p.id === selectedProdutoId);

  const handleSalvar = async () => {
    const numCheios = parseInt(qtdCheios, 10) || 0;

    if (!selectedProdutoId) {
      Alert.alert('Atenção', 'Selecione o produto que chegou da fábrica.');
      return;
    }

    if (numCheios <= 0) {
      Alert.alert('Atenção', 'Digite a quantidade de garrafões cheios recebidos.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      EstoqueService.registrarCargaFabrica({
        produtoId: selectedProdutoId,
        qtdCheiosRecebidos: numCheios,
        qtdVaziosDevolvidos: 0,
        observacao: observacao.trim() || undefined,
      });

      await HapticService.success();
      setQtdCheios('');
      setObservacao('');
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao registrar carga da fábrica');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Truck size={22} color={colors.primary} />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Chegada de Carga (Fábrica)</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Recebimento de galões cheios para o estoque
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Selecionar Produto */}
            <Text style={[styles.label, { color: colors.text }]}>1. Produto Recebido da Fábrica:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {produtosRetornaveis.map((prod) => {
                  const isSel = selectedProdutoId === prod.id;
                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[
                        styles.prodPill,
                        {
                          backgroundColor: isSel ? colors.primary : colors.surface,
                          borderColor: isSel ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        HapticService.light();
                        setSelectedProdutoId(prod.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.prodPillText,
                          { color: isSel ? '#fff' : colors.text, fontWeight: isSel ? '800' : '600' },
                        ]}
                      >
                        {prod.nome}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* 2. Garrafões Cheios Recebidos */}
            <View style={[styles.cardInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.inputHeading, { color: colors.success }]}>
                    🟢 CHEIOS RECEBIDOS (+ Estoque)
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    Garrafões cheios descarregados do caminhão
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: qtdCheios ? colors.success : colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={qtdCheios}
                  onChangeText={setQtdCheios}
                />
              </View>
            </View>

            {/* Observações / NF */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              Observação / Motorista / NF:
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Carga matutina Caruaru - NF 4580"
              placeholderTextColor={colors.textMuted}
              value={observacao}
              onChangeText={setObservacao}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleSalvar}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirmar Entrada de Carga</Text>
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
    maxHeight: '92%',
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
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  prodPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  prodPillText: {
    fontSize: 13,
  },
  cardInput: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  inputHeading: {
    fontSize: 13,
    fontWeight: '900',
  },
  numericInput: {
    width: 90,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
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
