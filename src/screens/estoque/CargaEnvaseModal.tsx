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
  Switch,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EstoqueService } from '../../database/dbService';
import { Produto } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { X, Truck, Check, Plus, Minus } from 'lucide-react-native';

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
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState('');
  const [atualizarGarrafoes, setAtualizarGarrafoes] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const alterarQtd = (prodId: string, delta: number) => {
    HapticService.light();
    const atual = quantidades[prodId] || 0;
    const nova = Math.max(0, atual + delta);
    setQuantidades({ ...quantidades, [prodId]: nova });
  };

  const handleSalvar = async () => {
    const itens = Object.entries(quantidades)
      .filter(([_, qtd]) => qtd > 0)
      .map(([produtoId, quantidade]) => ({ produtoId, quantidade }));

    if (itens.length === 0) {
      Alert.alert('Atenção', 'Informe a quantidade de pelo menos um produto que chegou da fábrica.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();
      for (const it of itens) {
        EstoqueService.adicionarCargaEnvase(it.produtoId, it.quantidade);
      }

      await HapticService.success();
      setQuantidades({});
      setMotivo('');
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao registrar carga');
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
                  Entrada diária de vasilhames cheios
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.text }]}>Produtos Recebidos:</Text>
            {produtos.map((prod) => {
              const qtd = quantidades[prod.id] || 0;
              return (
                <View key={prod.id} style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{prod.nome}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      Estoque atual: {prod.estoque?.quantidadeAtual || 0} un
                    </Text>
                  </View>
                  <View style={styles.counterBox}>
                    <TouchableOpacity
                      style={[styles.countBtn, { backgroundColor: colors.card }]}
                      onPress={() => alterarQtd(prod.id, -10)}
                    >
                      <Text style={[styles.countBtnText, { color: colors.text }]}>-10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.countBtn, { backgroundColor: colors.card }]}
                      onPress={() => alterarQtd(prod.id, -1)}
                    >
                      <Minus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.counterVal, { color: colors.primary }]}>{qtd}</Text>
                    <TouchableOpacity
                      style={[styles.countBtn, { backgroundColor: colors.card }]}
                      onPress={() => alterarQtd(prod.id, 1)}
                    >
                      <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.countBtn, { backgroundColor: colors.card }]}
                      onPress={() => alterarQtd(prod.id, 10)}
                    >
                      <Text style={[styles.countBtnText, { color: colors.text }]}>+10</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Toggle de Atualização de Ciclo */}
            <View style={[styles.toggleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>
                  Converter Garrafões Vazios em Cheios
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  Debita garrafões vazios entregues na fábrica e credita garrafões cheios no lote atual.
                </Text>
              </View>
              <Switch
                value={atualizarGarrafoes}
                onValueChange={setAtualizarGarrafoes}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {/* Motivo / NF */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              Observação / Número da NF:
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Carga matutina Caruaru - NF 4580"
              placeholderTextColor={colors.textMuted}
              value={motivo}
              onChangeText={setMotivo}
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
                  <Text style={styles.confirmBtnText}>Lançar Entrada no Estoque</Text>
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  counterVal: {
    fontSize: 17,
    fontWeight: '900',
    minWidth: 26,
    textAlign: 'center',
  },
  toggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    gap: 12,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
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
