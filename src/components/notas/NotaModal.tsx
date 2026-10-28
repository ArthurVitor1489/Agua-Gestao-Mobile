import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { NotasService } from '../../database/dbService';
import { Nota, ChecklistItem } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import {
  X,
  Pin,
  CheckSquare,
  FileText,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';

interface NotaModalProps {
  visible: boolean;
  notaParaEditar?: Nota | null;
  onClose: () => void;
  onSaved: () => void;
}

const CORES_PALETA = [
  { id: '#FEF3C7', nome: 'Amarelo', borda: '#F59E0B', texto: '#78350F' },
  { id: '#D1FAE5', nome: 'Verde', borda: '#10B981', texto: '#064E3B' },
  { id: '#DBEAFE', nome: 'Azul', borda: '#3B82F6', texto: '#1E3A8A' },
  { id: '#EDE9FE', nome: 'Roxo', borda: '#8B5CF6', texto: '#4C1D95' },
  { id: '#F1F5F9', nome: 'Cinza', borda: '#94A3B8', texto: '#0F172A' },
];

export const NotaModal: React.FC<NotaModalProps> = ({
  visible,
  notaParaEditar,
  onClose,
  onSaved,
}) => {
  const { colors, isDark } = useTheme();
  const { keyboardHeight, maxModalHeight } = useKeyboardOffset();

  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'texto' | 'checklist'>('texto');
  const [textoConteudo, setTextoConteudo] = useState('');
  const [checklistItens, setChecklistItens] = useState<ChecklistItem[]>([]);
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [corSelecionada, setCorSelecionada] = useState('#FEF3C7');
  const [fixado, setFixado] = useState(false);

  useEffect(() => {
    if (visible) {
      if (notaParaEditar) {
        setTitulo(notaParaEditar.titulo);
        setTipo(notaParaEditar.tipo);
        setCorSelecionada(notaParaEditar.cor || '#FEF3C7');
        setFixado(notaParaEditar.fixado);

        if (notaParaEditar.tipo === 'checklist') {
          try {
            const parsed = JSON.parse(notaParaEditar.conteudo);
            setChecklistItens(Array.isArray(parsed) ? parsed : []);
          } catch {
            setChecklistItens([]);
          }
          setTextoConteudo('');
        } else {
          setTextoConteudo(notaParaEditar.conteudo);
          setChecklistItens([]);
        }
      } else {
        // Nova nota
        setTitulo('');
        setTipo('texto');
        setTextoConteudo('');
        setChecklistItens([]);
        setNovoItemTexto('');
        setCorSelecionada('#FEF3C7');
        setFixado(false);
      }
    }
  }, [visible, notaParaEditar]);

  const handleAddItem = () => {
    const trimmed = novoItemTexto.trim();
    if (!trimmed) return;
    const novo: ChecklistItem = {
      id: 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      texto: trimmed,
      concluido: false,
    };
    setChecklistItens((prev) => [...prev, novo]);
    setNovoItemTexto('');
    HapticService.light();
  };

  const handleToggleItem = (id: string) => {
    setChecklistItens((prev) =>
      prev.map((item) => (item.id === id ? { ...item, concluido: !item.concluido } : item))
    );
    HapticService.light();
  };

  const handleRemoveItem = (id: string) => {
    setChecklistItens((prev) => prev.filter((item) => item.id !== id));
    HapticService.light();
  };

  const handleSalvar = () => {
    const t = titulo.trim();
    if (!t) {
      Alert.alert('Título Obrigatório', 'Por favor, informe um título ou assunto para a anotação.');
      return;
    }

    let conteudoFinal = '';
    if (tipo === 'checklist') {
      if (checklistItens.length === 0 && !novoItemTexto.trim()) {
        Alert.alert('Checklist Vazia', 'Adicione pelo menos um item à sua lista de tarefas.');
        return;
      }
      let itensFinais = [...checklistItens];
      if (novoItemTexto.trim()) {
        itensFinais.push({
          id: 'item-' + Date.now().toString(36),
          texto: novoItemTexto.trim(),
          concluido: false,
        });
      }
      conteudoFinal = JSON.stringify(itensFinais);
    } else {
      conteudoFinal = textoConteudo.trim();
    }

    NotasService.salvarNota({
      id: notaParaEditar?.id,
      titulo: t,
      conteudo: conteudoFinal,
      tipo,
      cor: corSelecionada,
      fixado,
      concluido: notaParaEditar?.concluido || false,
    });

    HapticService.success();
    onSaved();
    onClose();
  };

  const handleExcluir = () => {
    if (!notaParaEditar?.id) return;
    Alert.alert(
      'Excluir Anotação',
      'Tem certeza de que deseja apagar esta anotação permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            NotasService.excluirNota(notaParaEditar.id);
            HapticService.medium();
            onSaved();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[styles.overlay, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
      >
        <View
          style={[
            styles.modalBox,
            { backgroundColor: colors.card, borderColor: colors.border },
            maxModalHeight ? { maxHeight: maxModalHeight } : null,
          ]}
        >
          {/* Top Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setFixado(!fixado);
                  HapticService.light();
                }}
                style={[
                  styles.pinBadge,
                  {
                    backgroundColor: fixado ? '#F59E0B20' : colors.surface,
                    borderColor: fixado ? '#F59E0B' : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Pin size={18} color={fixado ? '#D97706' : colors.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {notaParaEditar ? 'Editar Anotação' : 'Novo Recado / Nota'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
            {/* Seletor de Tipo: Texto ou Checklist */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typePill,
                  {
                    backgroundColor: tipo === 'texto' ? colors.primary : colors.surface,
                    borderColor: tipo === 'texto' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setTipo('texto');
                  HapticService.light();
                }}
                activeOpacity={0.7}
              >
                <FileText size={16} color={tipo === 'texto' ? '#fff' : colors.textMuted} />
                <Text
                  style={[
                    styles.typeText,
                    { color: tipo === 'texto' ? '#fff' : colors.textMuted, fontWeight: '700' },
                  ]}
                >
                  Texto Livre
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  {
                    backgroundColor: tipo === 'checklist' ? colors.primary : colors.surface,
                    borderColor: tipo === 'checklist' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setTipo('checklist');
                  HapticService.light();
                }}
                activeOpacity={0.7}
              >
                <CheckSquare size={16} color={tipo === 'checklist' ? '#fff' : colors.textMuted} />
                <Text
                  style={[
                    styles.typeText,
                    { color: tipo === 'checklist' ? '#fff' : colors.textMuted, fontWeight: '700' },
                  ]}
                >
                  Lista (Checklist)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input de Título */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>TÍTULO OU ASSUNTO</Text>
            <TextInput
              style={[
                styles.titleInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Ex: Recado do entregador, Ligar p/ distribuidor..."
              placeholderTextColor={colors.textMuted}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={80}
            />

            {/* Seletor de Cores Post-it */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
              COR DO CARD
            </Text>
            <View style={styles.colorRow}>
              {CORES_PALETA.map((c) => {
                const isSelected = corSelecionada === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      setCorSelecionada(c.id);
                      HapticService.light();
                    }}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: c.id,
                        borderColor: isSelected ? c.borda : '#cbd5e1',
                        borderWidth: isSelected ? 3 : 1,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Check size={16} color={c.texto} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Conteúdo dinâmico baseado no tipo */}
            {tipo === 'texto' ? (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>ANOTAÇÃO</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: isDark ? colors.surface : corSelecionada,
                      borderColor: colors.border,
                      color: isDark ? colors.text : '#1e293b',
                    },
                  ]}
                  placeholder="Digite aqui todos os detalhes, instruções ou lembretes rápidos..."
                  placeholderTextColor={isDark ? colors.textMuted : '#64748b'}
                  value={textoConteudo}
                  onChangeText={setTextoConteudo}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            ) : (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>ITENS DA TAREFA</Text>

                {/* Lista de itens existentes */}
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {checklistItens.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.checklistItemRow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleItem(item.id)}
                        style={styles.checkboxTouchable}
                        activeOpacity={0.7}
                      >
                        {item.concluido ? (
                          <CheckCircle2 size={20} color="#10b981" />
                        ) : (
                          <Circle size={20} color={colors.textMuted} />
                        )}
                        <Text
                          style={[
                            styles.itemText,
                            {
                              color: item.concluido ? colors.textMuted : colors.text,
                              textDecorationLine: item.concluido ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {item.texto}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemoveItem(item.id)}
                        style={styles.deleteItemBtn}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {checklistItens.length === 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 4 }}>
                      Nenhum item adicionado ainda. Adicione uma tarefa abaixo:
                    </Text>
                  )}
                </View>

                {/* Input para novo item */}
                <View style={styles.addItemRow}>
                  <TextInput
                    style={[
                      styles.addItemInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Adicionar tarefa / item..."
                    placeholderTextColor={colors.textMuted}
                    value={novoItemTexto}
                    onChangeText={setNovoItemTexto}
                    onSubmitEditing={handleAddItem}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddItem}
                    activeOpacity={0.8}
                  >
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            {Boolean(notaParaEditar) && (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: '#fee2e2' }]}
                onPress={handleExcluir}
                activeOpacity={0.8}
              >
                <Trash2 size={18} color="#dc2626" />
                <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13 }}>Excluir</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSalvar}
              activeOpacity={0.8}
            >
              <Check size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                {notaParaEditar ? 'Salvar Alterações' : 'Salvar Nota'}
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    minHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  pinBadge: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  scrollArea: {
    paddingHorizontal: 20,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  titleInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 120,
    lineHeight: 20,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkboxTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    flex: 1,
  },
  deleteItemBtn: {
    padding: 6,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  addItemInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addItemBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
});