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
import { EstoqueService } from '../../database/dbService';
import { EstoqueGarrafao, StatusGarrafao } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { X, ArrowRightLeft, Check, AlertOctagon } from 'lucide-react-native';

interface MovimentarGarrafaModalProps {
  visible: boolean;
  garrafoes: EstoqueGarrafao[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MovimentarGarrafaModal: React.FC<MovimentarGarrafaModalProps> = ({
  visible,
  garrafoes,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [selectedOrigemId, setSelectedOrigemId] = useState<string>('');
  const [statusDestino, setStatusDestino] = useState<StatusGarrafao>('DANIFICADO');
  const [quantidade, setQuantidade] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filtrar apenas lotes com saldo > 0
  const lotesDisponiveis = garrafoes.filter((g) => g.quantidade > 0);

  const handleSalvar = async () => {
    const qtd = parseInt(quantidade, 10);
    const origem = garrafoes.find((g) => g.id === selectedOrigemId);

    if (!origem) {
      Alert.alert('Atenção', 'Selecione o lote de origem dos vasilhames.');
      return;
    }
    if (!qtd || qtd <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida maior que zero.');
      return;
    }
    if (qtd > origem.quantidade) {
      Alert.alert('Atenção', `Quantidade informada excede o saldo disponível (${origem.quantidade}).`);
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();
      EstoqueService.movimentarGarrafa({
        anoFabricacao: origem.anoFabricacao,
        statusOrigem: origem.status,
        statusDestino,
        quantidade: qtd,
        motivo: motivo.trim() || undefined,
      });

      await HapticService.success();
      setQuantidade('1');
      setMotivo('');
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao movimentar vasilhames');
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
              <ArrowRightLeft size={22} color={colors.secondary} />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Movimentação & Avarias</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Transferência de status de vasilhames
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Lote de Origem */}
            <Text style={[styles.label, { color: colors.text }]}>1. Selecione o Lote de Origem:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {lotesDisponiveis.map((lote) => {
                  const isSel = selectedOrigemId === lote.id;
                  return (
                    <TouchableOpacity
                      key={lote.id}
                      style={[
                        styles.loteCard,
                        {
                          backgroundColor: isSel ? colors.primaryLight : colors.surface,
                          borderColor: isSel ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        HapticService.light();
                        setSelectedOrigemId(lote.id);
                      }}
                    >
                      <Text style={[styles.loteAno, { color: colors.text }]}>Ano {lote.anoFabricacao}</Text>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>
                        {lote.status} ({lote.quantidade} un)
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Val: {lote.anoValidade}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Situação de Destino */}
            <Text style={[styles.label, { color: colors.text }]}>2. Nova Situação de Destino:</Text>
            <View style={styles.destinosGrid}>
              {[
                { id: 'DANIFICADO', label: 'Danificado / Trincado' },
                { id: 'QUEBRADO', label: 'Quebrado / Perda Total' },
                { id: 'VENCIDO', label: 'Vencido (ANP)' },
                { id: 'DESCARTADO', label: 'Descarte / Baixa Definitiva' },
                { id: 'VAZIO', label: 'Retorno para Vazio' },
                { id: 'CHEIO', label: 'Retorno para Cheio' },
              ].map((d) => {
                const isSel = statusDestino === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.destinoBtn,
                      {
                        backgroundColor: isSel ? colors.secondary : colors.surface,
                        borderColor: isSel ? colors.secondary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setStatusDestino(d.id as StatusGarrafao);
                    }}
                  >
                    <Text
                      style={[
                        styles.destinoText,
                        { color: isSel ? '#fff' : colors.text, fontWeight: isSel ? '800' : '600' },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantidade */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              3. Quantidade de Garrafões:
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              keyboardType="numeric"
              placeholder="1"
              value={quantidade}
              onChangeText={setQuantidade}
            />

            {/* Motivo */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              Motivo do Registro:
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Furo na base durante entrega, gargalo trincado, etc."
              placeholderTextColor={colors.textMuted}
              value={motivo}
              onChangeText={setMotivo}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.secondary }]}
              onPress={handleSalvar}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>Registrar Movimentação</Text>
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
  loteCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 120,
  },
  loteAno: {
    fontSize: 14,
    fontWeight: '800',
  },
  destinosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  destinoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '48%',
  },
  destinoText: {
    fontSize: 12,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: 'bold',
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
