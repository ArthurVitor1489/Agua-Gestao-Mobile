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
import { EstoqueGarrafao } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { X, AlertTriangle, Check, Minus, Plus } from 'lucide-react-native';

interface MovimentarGarrafaModalProps {
  visible: boolean;
  garrafoes?: EstoqueGarrafao[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MovimentarGarrafaModal: React.FC<MovimentarGarrafaModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  const [tipoVasilhame, setTipoVasilhame] = useState('Galão 20L');
  const [situacaoOrigem, setSituacaoOrigem] = useState<'CHEIO' | 'VAZIO'>('CHEIO');
  const [quantidade, setQuantidade] = useState('1');
  const [localAvaria, setLocalAvaria] = useState('Translado no Centro de Distribuição (CD)');
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const alterarQtd = (delta: number) => {
    HapticService.light();
    const atual = parseInt(quantidade, 10) || 1;
    const nova = Math.max(1, atual + delta);
    setQuantidade(String(nova));
  };

  const handleSalvar = async () => {
    const qtd = parseInt(quantidade, 10);
    if (!qtd || qtd <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      await HapticService.medium();

      EstoqueService.registrarAvaria({
        tipoVasilhame,
        situacaoOrigem,
        quantidade: qtd,
        localAvaria,
        observacao: observacao.trim() || undefined,
        produtoId: tipoVasilhame.includes('20L') ? 'prod-galao-20l' : undefined,
      });

      await HapticService.success();
      setQuantidade('1');
      setObservacao('');
      onSuccess();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao registrar avaria');
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
              <AlertTriangle size={22} color={colors.secondary} />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Registrar Avaria / Quebra</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Baixa de garrafão danificado no CD ou transporte
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Tipo do Vasilhame */}
            <Text style={[styles.label, { color: colors.text }]}>1. Vasilhame Danificado:</Text>
            <View style={styles.tipoRow}>
              <View
                style={[
                  styles.tipoBtn,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tipoBtnText,
                    { color: colors.primary, fontWeight: '800' },
                  ]}
                >
                  💧 Galão 20 Litros
                </Text>
              </View>
            </View>

            {/* 2. Situação no momento da quebra */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              2. O garrafão estava cheio ou vazio quando danificou?
            </Text>
            <View style={styles.estadoRow}>
              <TouchableOpacity
                style={[
                  styles.estadoBtn,
                  {
                    backgroundColor: situacaoOrigem === 'CHEIO' ? '#fee2e2' : colors.surface,
                    borderColor: situacaoOrigem === 'CHEIO' ? colors.danger : colors.border,
                  },
                ]}
                onPress={() => {
                  HapticService.light();
                  setSituacaoOrigem('CHEIO');
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: situacaoOrigem === 'CHEIO' ? colors.danger : colors.text,
                  }}
                >
                  🟢 Estava Cheio
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Perda da água + vasilhame
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.estadoBtn,
                  {
                    backgroundColor: situacaoOrigem === 'VAZIO' ? '#e0f2fe' : colors.surface,
                    borderColor: situacaoOrigem === 'VAZIO' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  HapticService.light();
                  setSituacaoOrigem('VAZIO');
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: situacaoOrigem === 'VAZIO' ? colors.primary : colors.text,
                  }}
                >
                  🔵 Estava Vazio
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Perda apenas do vasilhame
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. Onde ocorreu a avaria? */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              3. Onde ocorreu a quebra / avaria?
            </Text>
            <View style={styles.localGrid}>
              {[
                { id: 'Transporte da Fábrica', label: '🚛 Transporte da Fábrica (Caminhão)' },
                { id: 'Translado no Centro de Distribuição (CD)', label: '🏢 Translado no CD / Pátio' },
                { id: 'Rota de Entrega ao Cliente', label: '🛵 Rota de Entrega (Moto/Carroceria)' },
                { id: 'Furo / Microfissura (Vazando)', label: '💧 Garrafão Furado / Vazamento' },
                { id: 'Queda Acidental / Descarte', label: '💥 Queda Acidental / Descarte' },
              ].map((loc) => {
                const isSel = localAvaria === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.localBtn,
                      {
                        backgroundColor: isSel ? colors.primaryLight : colors.surface,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      HapticService.light();
                      setLocalAvaria(loc.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.localText,
                        { color: isSel ? colors.primary : colors.text, fontWeight: isSel ? '800' : '600' },
                      ]}
                    >
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Quantidade de Garrafões Danificados */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              4. Quantidade de Garrafões Danificados:
            </Text>
            <View style={styles.qtdBox}>
              <TouchableOpacity
                style={[styles.qtdControlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => alterarQtd(-1)}
              >
                <Minus size={18} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.qtdInput,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.secondary },
                ]}
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
                selectTextOnFocus
              />

              <TouchableOpacity
                style={[styles.qtdControlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => alterarQtd(1)}
              >
                <Plus size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Observações */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              Detalhe / Motivo da Perda (Opcional):
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Ex: Furo na base durante frenagem, trincou gargalo ao descarregar..."
              placeholderTextColor={colors.textMuted}
              value={observacao}
              onChangeText={setObservacao}
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
                  <Text style={styles.confirmBtnText}>Confirmar Baixa por Avaria</Text>
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
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tipoBtnText: {
    fontSize: 13,
  },
  estadoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  estadoBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  localGrid: {
    gap: 8,
  },
  localBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  localText: {
    fontSize: 13,
  },
  qtdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  qtdControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtdInput: {
    width: 80,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
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
