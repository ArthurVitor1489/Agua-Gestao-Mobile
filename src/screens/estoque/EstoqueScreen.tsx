import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EstoqueService, ProdutosService } from '../../database/dbService';
import { EstoqueGarrafao, Produto, MovimentacaoEstoque } from '../../database/models';
import { CargaEnvaseModal } from './CargaEnvaseModal';
import { MovimentarGarrafaModal } from './MovimentarGarrafaModal';
import { HapticService } from '../../services/hapticService';
import {
  Cylinder,
  Truck,
  AlertTriangle,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react-native';

export const EstoqueScreen: React.FC = () => {
  const { colors } = useTheme();

  const [garrafoes, setGarrafoes] = useState<EstoqueGarrafao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'garrafoes' | 'produtos' | 'auditoria'>('garrafoes');

  // Modais
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);

  useEffect(() => {
    carregarEstoque();
  }, []);

  const carregarEstoque = () => {
    try {
      setLoading(true);
      const g = EstoqueService.getGarrafoes();
      const p = ProdutosService.getProdutos();
      const m = EstoqueService.getMovimentacoes();
      setGarrafoes(g);
      setProdutos(p);
      setMovimentacoes(m);
    } catch (e) {
      console.warn('Erro ao carregar estoque:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await HapticService.light();
    await carregarEstoque();
  };

  // Totais de garrafões
  const cheios = garrafoes.filter((g) => g.status === 'CHEIO').reduce((acc, g) => acc + g.quantidade, 0);
  const vazios = garrafoes
    .filter((g) => g.status === 'VAZIO' || g.status === 'DISPONIVEL')
    .reduce((acc, g) => acc + g.quantidade, 0);
  const avarias = garrafoes
    .filter((g) => g.status === 'DANIFICADO' || g.status === 'QUEBRADO')
    .reduce((acc, g) => acc + g.quantidade, 0);
  const vencidos = garrafoes
    .filter((g) => g.status === 'VENCIDO' || g.status === 'DESCARTADO')
    .reduce((acc, g) => acc + g.quantidade, 0);

  const anoAtual = new Date().getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Abas Superiores */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'garrafoes' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('garrafoes');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'garrafoes' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'garrafoes' ? '800' : '600' },
            ]}
          >
            Vasilhames & Lotes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'produtos' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('produtos');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'produtos' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'produtos' ? '800' : '600' },
            ]}
          >
            Estoque Produtos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'auditoria' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('auditoria');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'auditoria' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'auditoria' ? '800' : '600' },
            ]}
          >
            Extrato Auditoria
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Painel de Ações Rápidas de Depósito */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              HapticService.medium();
              setShowCargaModal(true);
            }}
            activeOpacity={0.8}
          >
            <Truck size={18} color="#fff" />
            <Text style={styles.primaryActionText}>Carga de Fábrica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              HapticService.light();
              setShowMovimentarModal(true);
            }}
            activeOpacity={0.8}
          >
            <AlertTriangle size={18} color={colors.secondary} />
            <Text style={[styles.secondaryActionText, { color: colors.text }]}>Lançar Avaria</Text>
          </TouchableOpacity>
        </View>

        {abaAtiva === 'garrafoes' && (
          <>
            {/* Cards de Resumo de Vasilhames */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>CHEIOS</Text>
                <Text style={[styles.kpiNum, { color: colors.success }]}>{cheios}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Prontos p/ rota</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>VAZIOS</Text>
                <Text style={[styles.kpiNum, { color: colors.primary }]}>{vazios}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Aguardando fábrica</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>AVARIADOS</Text>
                <Text style={[styles.kpiNum, { color: colors.secondary }]}>{avarias}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Trincados/danificados</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>VENCIDOS (ANP)</Text>
                <Text style={[styles.kpiNum, { color: colors.danger }]}>{vencidos}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>+3 anos de uso</Text>
              </View>
            </View>

            {/* Lista de Lotes por Ano de Fabricação (Regra ANP 3 Anos) */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
              Lotes de Vasilhames por Ano de Fabricação
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {garrafoes.map((lote) => {
                const anosRestantes = lote.anoValidade - anoAtual;
                const isVencido = anosRestantes < 0;
                const isProximoVencimento = anosRestantes <= 1 && !isVencido;

                return (
                  <View
                    key={lote.id}
                    style={[
                      styles.loteCardItem,
                      {
                        backgroundColor: colors.card,
                        borderColor: isVencido ? colors.danger : isProximoVencimento ? colors.warning : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.loteItemAno, { color: colors.text }]}>
                          Lote {lote.anoFabricacao}
                        </Text>
                        <View
                          style={[
                            styles.statusTag,
                            {
                              backgroundColor:
                                lote.status === 'CHEIO'
                                  ? '#dcfce7'
                                  : lote.status === 'VAZIO'
                                  ? '#e0f2fe'
                                  : '#fee2e2',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '900',
                              color:
                                lote.status === 'CHEIO'
                                  ? '#15803d'
                                  : lote.status === 'VAZIO'
                                  ? '#0284c7'
                                  : '#b91c1c',
                            }}
                          >
                            {lote.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        Validade ANP: {lote.anoValidade} ({isVencido ? 'VENCIDO' : `${anosRestantes} ano(s) restante(s)`})
                      </Text>
                    </View>

                    <Text style={[styles.loteItemQtd, { color: colors.text }]}>{lote.quantidade} un</Text>
                  </View>
                );
              })}
              {garrafoes.length === 0 && (
                <Text style={{ textAlign: 'center', color: colors.textMuted, padding: 20 }}>
                  Nenhum lote de garrafão cadastrado.
                </Text>
              )}
            </View>
          </>
        )}

        {abaAtiva === 'produtos' && (
          <View style={{ gap: 8 }}>
            {produtos.map((p) => (
              <View
                key={p.id}
                style={[styles.produtoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.produtoNome, { color: colors.text }]}>{p.nome}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Categoria: {p.categoria} • Preço: R$ {p.precoVenda.toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.produtoEstoqueNum,
                      {
                        color:
                          (p.estoque?.quantidadeAtual || 0) <= (p.estoque?.quantidadeMinima || 10)
                            ? colors.danger
                            : colors.success,
                      },
                    ]}
                  >
                    {p.estoque?.quantidadeAtual || 0} un
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Mín: {p.estoque?.quantidadeMinima || 10} un
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {abaAtiva === 'auditoria' && (
          <View style={{ gap: 8 }}>
            {movimentacoes.slice(0, 30).map((m) => {
              const isEntrada = m.tipo === 'ENTRADA' || m.tipo === 'DEVOLUCAO';
              const Icon = isEntrada ? ArrowUpRight : ArrowDownRight;
              const cor = isEntrada ? colors.success : colors.danger;
              const dataFormatada = new Date(m.data).toLocaleString('pt-BR');

              return (
                <View
                  key={m.id}
                  style={[styles.auditCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.auditIcon, { backgroundColor: cor + '20' }]}>
                    <Icon size={18} color={cor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.auditMotivo, { color: colors.text }]} numberOfLines={2}>
                      {m.motivo || `${m.tipo} de estoque`}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{dataFormatada}</Text>
                  </View>
                  <Text style={[styles.auditQtd, { color: cor }]}>
                    {isEntrada ? '+' : '-'}
                    {m.quantidade}
                  </Text>
                </View>
              );
            })}
            {movimentacoes.length === 0 && (
              <Text style={{ textAlign: 'center', color: colors.textMuted, padding: 30 }}>
                Nenhuma movimentação de estoque registrada.
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modais */}
      <CargaEnvaseModal
        visible={showCargaModal}
        produtos={produtos}
        onClose={() => setShowCargaModal(false)}
        onSuccess={() => {
          setShowCargaModal(false);
          carregarEstoque();
        }}
      />

      <MovimentarGarrafaModal
        visible={showMovimentarModal}
        garrafoes={garrafoes}
        onClose={() => setShowMovimentarModal(false)}
        onSuccess={() => {
          setShowMovimentarModal(false);
          carregarEstoque();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
  },
  contentScroll: {
    padding: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    width: '48.5%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiNum: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  loteCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  loteItemAno: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  loteItemQtd: {
    fontSize: 17,
    fontWeight: '900',
  },
  produtoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  produtoNome: {
    fontSize: 15,
    fontWeight: '800',
  },
  produtoEstoqueNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  auditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  auditIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditMotivo: {
    fontSize: 13,
    fontWeight: '700',
  },
  auditQtd: {
    fontSize: 16,
    fontWeight: '900',
  },
});
