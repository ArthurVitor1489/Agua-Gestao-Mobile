import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { NotasService } from '../../database/dbService';
import { Nota, ChecklistItem } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import { NotaModal } from './NotaModal';
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  CheckCircle2,
  Circle,
  FileText,
  CheckSquare,
  ChevronRight,
  MoreVertical,
} from 'lucide-react-native';

interface BlocoNotasCardProps {
  notas: Nota[];
  onRefresh: () => void;
}

export const BlocoNotasCard: React.FC<BlocoNotasCardProps> = ({ notas, onRefresh }) => {
  const { colors, isDark } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);

  const handleAbrirNova = () => {
    setNotaSelecionada(null);
    setModalVisible(true);
    HapticService.light();
  };

  const handleEditarNota = (nota: Nota) => {
    setNotaSelecionada(nota);
    setModalVisible(true);
    HapticService.light();
  };

  const handleTogglePin = (id: string, e?: any) => {
    NotasService.toggleFixado(id);
    HapticService.light();
    onRefresh();
  };

  const handleToggleConcluir = (id: string) => {
    NotasService.toggleConcluido(id);
    HapticService.success();
    onRefresh();
  };

  const handleToggleCheckItem = (notaId: string, itemId: string) => {
    NotasService.toggleChecklistItem(notaId, itemId);
    HapticService.light();
    onRefresh();
  };

  const handleExcluirNota = (id: string, titulo: string) => {
    Alert.alert(
      'Excluir Nota',
      `Deseja realmente apagar "${titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            NotasService.excluirNota(id);
            HapticService.medium();
            onRefresh();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.containerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header da Seção */}
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.headerIconBox, { backgroundColor: '#fef3c7' }]}>
            <StickyNote size={20} color="#b45309" />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Bloco de Notas
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Lembretes
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={handleAbrirNova}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.newBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo / Lista de Notas */}
      {notas.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleAbrirNova}
          activeOpacity={0.7}
        >
          <StickyNote size={28} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nenhuma anotação ativa
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Toque aqui para anotar recados de clientes, tarefas da entrega ou lembretes do dia.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.notesList}>
          {notas.map((nota) => {
            const isChecklist = nota.tipo === 'checklist';
            let itens: ChecklistItem[] = [];
            if (isChecklist) {
              try {
                const parsed = JSON.parse(nota.conteudo);
                if (Array.isArray(parsed)) itens = parsed;
              } catch {
                itens = [];
              }
            }

            const totalItens = itens.length;
            const concluidosCount = itens.filter((i) => i.concluido).length;
            const porcentagem = totalItens > 0 ? (concluidosCount / totalItens) * 100 : 0;

            const bgCor = isDark ? colors.surface : (nota.cor || '#FEF3C7');
            const textoCor = isDark ? colors.text : '#1e293b';

            return (
              <View
                key={nota.id}
                style={[
                  styles.noteItemCard,
                  {
                    backgroundColor: bgCor,
                    borderColor: nota.fixado ? '#F59E0B' : (isDark ? colors.border : '#e2e8f0'),
                    borderWidth: nota.fixado ? 2 : 1,
                  },
                ]}
              >
                {/* Cabeçalho da Nota */}
                <View style={styles.noteItemHeader}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => handleEditarNota(nota)}
                    activeOpacity={0.7}
                  >
                    {isChecklist ? (
                      <CheckSquare size={16} color={nota.fixado ? '#d97706' : colors.primary} />
                    ) : (
                      <FileText size={16} color={nota.fixado ? '#d97706' : colors.primary} />
                    )}
                    <Text
                      style={[
                        styles.noteTitle,
                        { color: textoCor },
                      ]}
                      numberOfLines={1}
                    >
                      {nota.titulo}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {/* Botão Fixar */}
                    <TouchableOpacity
                      style={[
                        styles.pinIconBtn,
                        {
                          backgroundColor: nota.fixado ? '#FDE68A' : 'transparent',
                        },
                      ]}
                      onPress={() => handleTogglePin(nota.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Pin
                        size={15}
                        color={nota.fixado ? '#B45309' : (isDark ? colors.textMuted : '#64748b')}
                      />
                    </TouchableOpacity>

                    {/* Botão Concluir/Arquivar Nota */}
                    <TouchableOpacity
                      style={styles.doneIconBtn}
                      onPress={() => handleToggleConcluir(nota.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CheckCircle2
                        size={17}
                        color={isDark ? colors.textMuted : '#64748b'}
                      />
                    </TouchableOpacity>

                    {/* Botão Excluir Nota */}
                    <TouchableOpacity
                      style={styles.doneIconBtn}
                      onPress={() => handleExcluirNota(nota.id, nota.titulo)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2
                        size={15}
                        color={isDark ? colors.textMuted : '#ef4444'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Corpo da Nota */}
                {isChecklist ? (
                  <View style={styles.checklistContainer}>
                    {/* Barra de Progresso */}
                    {totalItens > 0 && (
                      <View style={styles.progressRow}>
                        <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.border : '#e2e8f0' }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${porcentagem}%`,
                                backgroundColor: porcentagem === 100 ? '#10b981' : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressText, { color: isDark ? colors.textMuted : '#64748b' }]}>
                          {concluidosCount}/{totalItens}
                        </Text>
                      </View>
                    )}

                    {/* Itens Interativos */}
                    <View style={{ gap: 6, marginTop: 4 }}>
                      {itens.slice(0, 4).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.checkItemRow}
                          onPress={() => handleToggleCheckItem(nota.id, item.id)}
                          activeOpacity={0.7}
                        >
                          {item.concluido ? (
                            <CheckCircle2 size={18} color="#10b981" />
                          ) : (
                            <Circle size={18} color={isDark ? colors.textMuted : '#94a3b8'} />
                          )}
                          <Text
                            style={[
                              styles.checkItemText,
                              {
                                color: item.concluido
                                  ? (isDark ? colors.textMuted : '#94a3b8')
                                  : textoCor,
                                textDecorationLine: item.concluido ? 'line-through' : 'none',
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.texto}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {itens.length > 4 && (
                        <TouchableOpacity
                          onPress={() => handleEditarNota(nota)}
                          style={{ paddingTop: 4 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                            + ver mais {itens.length - 4} itens...
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleEditarNota(nota)}
                    activeOpacity={0.7}
                    style={{ marginTop: 6 }}
                  >
                    <Text
                      style={[
                        styles.noteBodyText,
                        { color: isDark ? colors.textMuted : '#475569' },
                      ]}
                      numberOfLines={3}
                    >
                      {nota.conteudo || 'Toque para adicionar detalhes a esta nota...'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Modal de Criação / Edição */}
      <NotaModal
        visible={modalVisible}
        notaParaEditar={notaSelecionada}
        onClose={() => setModalVisible(false)}
        onSaved={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  badgeCount: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  notesList: {
    gap: 10,
  },
  noteItemCard: {
    borderRadius: 16,
    padding: 14,
  },
  noteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  pinIconBtn: {
    padding: 5,
    borderRadius: 8,
  },
  doneIconBtn: {
    padding: 5,
    borderRadius: 8,
  },
  noteBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  checklistContainer: {
    marginTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  checkItemText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});