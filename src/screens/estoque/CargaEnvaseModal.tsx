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
import { X, Truck, Check, Plus, Minus, ArrowRightLeft, Sparkles } from 'lucide-react-native';

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

  // Produtos que usam vasilhame retornável (Água e Gás)
  const produtosRetornaveis = produtos.filter(
    (p) =>
      p.categoria === 'AGUA_20L' ||
      p.categoria === 'AGUA_10L' ||
      p.categoria === 'GAS_P13' ||
      p.nome.includes('20L') ||
      p.nome.includes('Gás')
  );

  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [qtdCheios, setQtdCheios] = useState('50');
  const [qtdVazios, setQtdVazios] = useState('50');
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && produtosRetornaveis.length > 0 && !selectedProdutoId) {
      setSelectedProdutoId(produtosRetornaveis[0].id);
    }
  }, [visible, produtosRetornaveis]);

  const produtoSelecionado = produtos.find((p) => p.id === selectedProdutoId);

  const aplicarTrocaExata = () => {
    HapticService.light();
    setQtdVazios(qtdCheios);
  };

  const handleSalvar = async () => {
    const numCheios = parseInt(qtdCheios, 10) || 0;
    const numVazios = parseInt(qtdVazios, 10) || 0;

    if (!selectedProdutoId) {
      Alert.alert('Atenção', 'Selecione o produto que chegou da fábrica.');
      return;
    }

    if (numCheios <= 0 && numVazios <= 0) {
      Alert.alert('Atenção', 'Informe a quantidade de garrafões cheios recebidos ou vazios entregues.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      EstoqueService.registrarCargaFabrica({
        produtoId: selectedProdutoId,
        qtdCheiosRecebidos: numCheios,
        qtdVaziosDevolvidos: numVazios,
        observacao: observacao.trim() || undefined,
      });

      await HapticService.success();
      setQtdCheios('50');
      setQtdVazios('50');
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
                  Recebimento de cheios e devolução de vazios
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
                <View>
                  <Text style={[styles.inputHeading, { color: colors.success }]}>
                    🟢 CHEIOS RECEBIDOS (+ Estoque)
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    Garrafões cheios que desceram do caminhão
                  </Text>
                </View>
                <TextInput
                  style={[styles.numericInput, { color: colors.text, borderColor: colors.success }]}
                  keyboardType="numeric"
                  value={qtdCheios}
                  onChangeText={setQtdCheios}
                  selectTextOnFocus
                />
              </View>

              {/* Botões rápidos */}
              <View style={styles.quickBtnRow}>
                {[10, 25, 50, 100, 150].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      HapticService.light();
                      setQtdCheios(String(n));
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Botão de Troca 1 por 1 */}
            <TouchableOpacity
              style={[styles.trocaExataBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={aplicarTrocaExata}
              activeOpacity={0.7}
            >
              <ArrowRightLeft size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                Troca Padrão: Devolveu {qtdCheios || '0'} Vazios (1 por 1)
              </Text>
            </TouchableOpacity>

            {/* 3. Garrafões Vazios Devolvidos */}
            <View style={[styles.cardInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[styles.inputHeading, { color: colors.primary }]}>
                    🔵 VAZIOS ENVIADOS (- Pátio)
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    Vazios entregues à fábrica para recarga
                  </Text>
                </View>
                <TextInput
                  style={[styles.numericInput, { color: colors.text, borderColor: colors.primary }]}
                  keyboardType="numeric"
                  value={qtdVazios}
                  onChangeText={setQtdVazios}
                  selectTextOnFocus
                />
              </View>

              {/* Botões rápidos */}
              <View style={styles.quickBtnRow}>
                {[0, 10, 25, 50, 100].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      HapticService.light();
                      setQtdVazios(String(n));
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{n}</Text>
                  </TouchableOpacity>
                ))}
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
    width: 80,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
  },
  quickBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  trocaExataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 10,
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
