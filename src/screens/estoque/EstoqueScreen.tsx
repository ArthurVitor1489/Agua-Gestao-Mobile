import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EstoqueService, ProdutosService } from '../../database/dbService';
import { EstoqueGarrafao, Produto, MovimentacaoEstoque } from '../../database/models';
import { CargaEnvaseModal } from './CargaEnvaseModal';
import { MovimentarGarrafaModal } from './MovimentarGarrafaModal';
import { ProdutoFormModal } from '../configuracoes/ProdutoFormModal';
import { HapticService } from '../../services/hapticService';
import {
  Cylinder,
  Truck,
  AlertTriangle,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Droplets,
  Flame,
  CheckCircle2,
  Plus,
  RotateCcw,
} from 'lucide-react-native';

export const EstoqueScreen: React.FC = () => {
  const { colors } = useTheme();

  const [garrafoes, setGarrafoes] = useState<EstoqueGarrafao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'vasilhames' | 'produtos' | 'auditoria'>('vasilhames');

  // Modais
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [showNovoProdutoModal, setShowNovoProdutoModal] = useState(false);

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
    carregarEstoque();
  };

  const handleZerarEstoque = () => {
    Alert.alert(
      'Zerar Todo o Estoque',
      'Tem certeza que deseja zerar todos os saldos de águas, garrafões cheios, vazios e avarias? Essa ação colocará todos os saldos em 0.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Zerar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              EstoqueService.zerarTodoEstoque();
              await HapticService.warning();
              carregarEstoque();
              Alert.alert('Sucesso', 'Todo o estoque e vasilhames foram zerados com sucesso!');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao zerar estoque.');
            }
          },
        },
      ]
    );
  };

  // Resumo de Vasilhames
  const resumo = EstoqueService.getResumoVasilhames();
  const percentualCheios =
    resumo.totalGeral > 0 ? Math.round((resumo.cheios / (resumo.cheios + resumo.vazios || 1)) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Abas Superiores */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'vasilhames' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('vasilhames');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'vasilhames' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'vasilhames' ? '800' : '600' },
            ]}
          >
            Vasilhames & Pátio
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
            Catálogo de Águas
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
            Extrato de Movimentações
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
            <Truck size={17} color="#fff" />
            <Text style={styles.primaryActionText}>Carga Fábrica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              HapticService.light();
              setShowMovimentarModal(true);
            }}
            activeOpacity={0.8}
          >
            <AlertTriangle size={17} color={colors.secondary} />
            <Text style={[styles.secondaryActionText, { color: colors.text }]}>Lançar Avaria</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zerarActionBtn, { backgroundColor: colors.surface, borderColor: '#fca5a5' }]}
            onPress={handleZerarEstoque}
            activeOpacity={0.8}
          >
            <RotateCcw size={15} color={colors.danger} />
            <Text style={[styles.zerarActionText, { color: colors.danger }]}>Zerar</Text>
          </TouchableOpacity>
        </View>

        {/* ---------------- ABA 1: VASILHAMES & PÁTIO ---------------- */}
        {abaAtiva === 'vasilhames' && (
          <>
            {/* Cards de Resumo Rápido */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '800' }}>CHEIOS PRONTOS</Text>
                <Text style={[styles.kpiNum, { color: colors.success }]}>{resumo.cheios}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Prontos p/ rota</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '800' }}>VAZIOS NO PÁTIO</Text>
                <Text style={[styles.kpiNum, { color: colors.primary }]}>{resumo.vazios}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Aguardando fábrica</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '800' }}>AVARIADOS</Text>
                <Text style={[styles.kpiNum, { color: colors.secondary }]}>{resumo.avarias}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Quebras no CD/transporte</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '800' }}>TOTAL VASILHAMES</Text>
                <Text style={[styles.kpiNum, { color: colors.text }]}>{resumo.totalGeral}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Patrimônio em estoque</Text>
              </View>
            </View>

            {/* Balanço Operacional Visual */}
            <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Droplets size={22} color={colors.primary} />
                  <View>
                    <Text style={[styles.balanceTitle, { color: colors.text }]}>Galão de Água 20L</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Ciclo de Vasilhames Retornáveis</Text>
                  </View>
                </View>
                <View style={[styles.badgePercent, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>
                    {percentualCheios}% Cheios
                  </Text>
                </View>
              </View>

              {/* Barra de Progresso Visual Cheios vs Vazios */}
              <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(5, percentualCheios))}%`, backgroundColor: colors.success },
                  ]}
                />
              </View>

              <View style={styles.balanceLegendRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: colors.success }]} />
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700' }}>
                    {resumo.cheios} un Cheios
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700' }}>
                    {resumo.vazios} un Vazios
                  </Text>
                </View>

                {resumo.avarias > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
                    <Text style={{ fontSize: 12, color: colors.secondary, fontWeight: '700' }}>
                      {resumo.avarias} avarias
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Como funciona o fluxo */}
            <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoBoxTitle, { color: colors.text }]}>💡 Como funciona o ciclo simples:</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                • <Text style={{ fontWeight: 'bold' }}>Chegada da fábrica:</Text> receba os cheios do caminhão e entregue os vazios em troca.{'\n'}
                • <Text style={{ fontWeight: 'bold' }}>Venda em rota / balcão:</Text> ao vender água 20L, o app debita 1 cheio e credita 1 vazio automaticamente.{'\n'}
                • <Text style={{ fontWeight: 'bold' }}>Avarias e quebras:</Text> se quebrar no transporte ou no CD, lance na opção "Lançar Avaria" para manter seu estoque sempre exato.
              </Text>
            </View>
          </>
        )}

        {/* ---------------- ABA 2: PRODUTOS ---------------- */}
        {abaAtiva === 'produtos' && (
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                gap: 6,
                marginBottom: 6,
              }}
              onPress={() => {
                HapticService.medium();
                setShowNovoProdutoModal(true);
              }}
            >
              <Plus size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>CADASTRAR NOVA ÁGUA / MARCA</Text>
            </TouchableOpacity>

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
                    {p.categoria.includes('AGUA') || p.categoria.includes('GAS') ? 'Cheios prontos' : 'Em estoque'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ---------------- ABA 3: EXTRATO / AUDITORIA ---------------- */}
        {abaAtiva === 'auditoria' && (
          <View style={{ gap: 8 }}>
            {movimentacoes.slice(0, 40).map((m) => {
              const isEntrada = m.tipo === 'ENTRADA' || m.tipo === 'DEVOLUCAO';
              const isAvaria = m.motivo?.toLowerCase().includes('avaria');
              const Icon = isEntrada ? ArrowUpRight : ArrowDownRight;
              const cor = isAvaria ? colors.secondary : isEntrada ? colors.success : colors.danger;
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
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{dataFormatada}</Text>
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

      <ProdutoFormModal
        visible={showNovoProdutoModal}
        onClose={() => setShowNovoProdutoModal(false)}
        onSuccess={() => {
          setShowNovoProdutoModal(false);
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
    gap: 8,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  zerarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  zerarActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48.5%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiNum: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgePercent: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  balanceLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
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
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  auditIcon: {
    width: 38,
    height: 38,
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
