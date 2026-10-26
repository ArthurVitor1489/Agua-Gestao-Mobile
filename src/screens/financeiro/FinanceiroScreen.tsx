import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { FinanceiroService, DashboardService } from '../../database/dbService';
import { Fiado, Despesa, DashboardData, GanhosMes } from '../../database/models';
import { NovaDespesaModal } from './NovaDespesaModal';
import { QuitarFiadoModal } from './QuitarFiadoModal';
import { HapticService } from '../../services/hapticService';
import {
  DollarSign,
  BookOpen,
  ArrowDownCircle,
  Plus,
  QrCode,
  CreditCard,
  Banknote,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Calendar,
  ArrowUpRight,
  Droplets,
} from 'lucide-react-native';

export const FinanceiroScreen: React.FC = () => {
  const { colors } = useTheme();

  const [abaAtiva, setAbaAtiva] = useState<'ganhos' | 'caixa' | 'fiados' | 'despesas'>('ganhos');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [totalFiados, setTotalFiados] = useState(0);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [ganhosMeses, setGanhosMeses] = useState<GanhosMes[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modais
  const [showNovaDespesaModal, setShowNovaDespesaModal] = useState(false);
  const [selectedFiadoQuitar, setSelectedFiadoQuitar] = useState<Fiado | null>(null);

  // Recarrega fluxo de caixa e fiados sempre que entra na tela
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    try {
      const dash = DashboardService.getDashboard('mes');
      const fList = FinanceiroService.getFiados();
      const totFiados = fList.reduce((acc, f) => acc + f.saldo, 0);
      const dList = FinanceiroService.getDespesas();
      const totDesp = dList.reduce((acc, d) => acc + d.valor, 0);
      const gList = FinanceiroService.getGanhosPorMes(6);

      setDashboard(dash);
      setFiados(fList);
      setTotalFiados(totFiados);
      setDespesas(dList);
      setTotalDespesas(totDesp);
      setGanhosMeses(gList);
    } catch (e) {
      console.warn('Erro ao carregar financeiro:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await HapticService.light();
    carregarDados();
  };

  const despesasMes = dashboard?.despesas || 0;
  const saldoLiquido = (dashboard?.recebido || 0) - despesasMes;
  const mesAtualDados = ganhosMeses.find((m) => m.isMesAtual) || ganhosMeses[0];
  const totalFaturadoAcumulado = ganhosMeses.reduce((acc, m) => acc + m.faturamento, 0);
  const lucroAcumulado = ganhosMeses.reduce((acc, m) => acc + m.lucroLiquido, 0);
  const totalGaloesAcumulado = ganhosMeses.reduce((acc, m) => acc + m.totalGaloes, 0);

  // Linha cronológica para o gráfico (da esquerda para direita: mais antigo -> atual)
  const mesesCronologicos = [...ganhosMeses].reverse();
  const maxFaturamentoGrafico = Math.max(...mesesCronologicos.map((m) => m.faturamento), 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Abas */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'ganhos' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('ganhos');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'ganhos' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'ganhos' ? '800' : '600' },
            ]}
          >
            Ganhos/Mês
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'caixa' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('caixa');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'caixa' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'caixa' ? '800' : '600' },
            ]}
          >
            Caixa & DRE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'fiados' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('fiados');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'fiados' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'fiados' ? '800' : '600' },
            ]}
          >
            Fiados ({fiados.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'despesas' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('despesas');
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: abaAtiva === 'despesas' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'despesas' ? '800' : '600' },
            ]}
          >
            Despesas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Aba 0: Ganhos por Mês */}
      {abaAtiva === 'ganhos' && (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Card Resumo do Mês Atual */}
          <View style={[styles.dreCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '800' }}>
                LUCRO LÍQUIDO ({mesAtualDados?.rotuloMes ? mesAtualDados.rotuloMes.toUpperCase() : 'MÊS ATUAL'})
              </Text>
              <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#15803d', fontSize: 10, fontWeight: '800' }}>MÊS ATUAL</Text>
              </View>
            </View>

            <Text
              style={[
                styles.dreBigNum,
                { color: (mesAtualDados?.lucroLiquido || 0) >= 0 ? colors.success : colors.danger },
              ]}
            >
              R$ {(mesAtualDados?.lucroLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Lucro Real do Mês (Vendas (-) Despesas)
            </Text>

            <View style={[styles.dreDivider, { borderTopColor: colors.border }]} />

            <View style={styles.dreRow}>
              <View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Faturamento Mês</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>
                  R$ {(mesAtualDados?.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Despesas Mês</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.danger }}>
                  - R$ {(mesAtualDados?.despesas || 0).toFixed(2)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Galões Mês</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                  {mesAtualDados?.totalGaloes || 0} un
                </Text>
              </View>
            </View>
          </View>

          {/* Gráfico Comparativo Visual de Barras */}
          <View style={[styles.graficoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
                  Comparativo Mensal
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Faturamento (R$)</Text>
            </View>

            <View style={styles.barsContainer}>
              {mesesCronologicos.map((m) => {
                const alturaPercentual = Math.max(10, Math.round((m.faturamento / maxFaturamentoGrafico) * 110));
                const isDestaque = m.isMesAtual;

                return (
                  <View key={m.mesAno} style={styles.barColumn}>
                    {/* Rótulo de Valor */}
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 4, height: 12 }}>
                      {m.faturamento > 0
                        ? m.faturamento >= 1000
                          ? `${(m.faturamento / 1000).toFixed(1)}k`
                          : m.faturamento.toFixed(0)
                        : '-'}
                    </Text>

                    {/* Barra Vertical */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: alturaPercentual,
                            backgroundColor: isDestaque ? colors.primary : colors.primaryLight,
                            borderColor: isDestaque ? colors.primary : colors.border,
                            borderWidth: isDestaque ? 1.5 : 1,
                          },
                        ]}
                      />
                    </View>

                    {/* Rótulo do Mês */}
                    <View
                      style={[
                        styles.barMonthBadge,
                        isDestaque && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.barMonthText,
                          { color: isDestaque ? '#fff' : colors.textMuted, fontWeight: isDestaque ? '900' : '600' },
                        ]}
                      >
                        {m.rotuloCurto.split('/')[0]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Lista Detalhada Mês a Mês */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18, marginBottom: 10 }]}>
            Detalhamento por Mês
          </Text>

          <View style={{ gap: 10 }}>
            {ganhosMeses.map((m) => {
              const isLucroPositivo = m.lucroLiquido >= 0;

              return (
                <View
                  key={m.mesAno}
                  style={[
                    styles.mesCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: m.isMesAtual ? colors.primary : colors.border,
                      borderWidth: m.isMesAtual ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Cabeçalho do Card */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Calendar size={16} color={colors.primary} />
                      <Text style={[styles.mesCardTitulo, { color: colors.text }]}>{m.rotuloMes}</Text>
                    </View>
                    {m.isMesAtual && (
                      <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#15803d', fontSize: 10, fontWeight: '800' }}>MÊS ATUAL</Text>
                      </View>
                    )}
                  </View>

                  {/* Lucro Líquido do Mês */}
                  <View style={{ marginVertical: 10 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>
                      LUCRO LÍQUIDO DO MÊS
                    </Text>
                    <Text
                      style={[
                        styles.mesCardLucro,
                        { color: isLucroPositivo ? colors.success : colors.danger },
                      ]}
                    >
                      {isLucroPositivo ? '+ ' : ''}R$ {m.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  {/* Linha Faturamento x Despesas */}
                  <View style={[styles.mesCardGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>Faturamento Total</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                        R$ {m.faturamento.toFixed(2)}
                      </Text>
                      {m.emAberto > 0 && (
                        <Text style={{ fontSize: 9, color: '#b91c1c', fontWeight: '700', marginTop: 2 }}>
                          R$ {m.emAberto.toFixed(2)} fiado pendente
                        </Text>
                      )}
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ flex: 1, paddingLeft: 8 }}>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>Despesas Mês</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.danger }}>
                        - R$ {m.despesas.toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                        Gastos de rota/depósito
                      </Text>
                    </View>
                  </View>

                  {/* Linha Galões e Ticket Médio */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Droplets size={14} color={colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        {m.totalGaloes} {m.totalGaloes === 1 ? 'galão' : 'galões'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        • {m.totalPedidos} {m.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      Ticket médio: <Text style={{ fontWeight: '700', color: colors.text }}>R$ {m.ticketMedio.toFixed(2)}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Conteúdo Aba 1: Caixa & DRE */}
      {abaAtiva === 'caixa' && (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Card Resultado Líquido */}
          <View style={[styles.dreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '800' }}>
              RESULTADO LÍQUIDO OPERACIONAL
            </Text>
            <Text
              style={[
                styles.dreBigNum,
                { color: saldoLiquido >= 0 ? colors.success : colors.danger },
              ]}
            >
              R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>

            <View style={[styles.dreDivider, { borderTopColor: colors.border }]} />

            <View style={styles.dreRow}>
              <View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Receitas Recebidas</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.success }}>
                  + R$ {(dashboard?.recebido || 0).toFixed(2)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Despesas do Mês</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.danger }}>
                  - R$ {despesasMes.toFixed(2)}
                </Text>
              </View>
            </View>

            {(dashboard?.emAberto || 0) > 0 && (
              <View style={{ backgroundColor: colors.surface, padding: 10, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }}>
                  💡 <Text style={{ fontWeight: '800', color: colors.text }}>Total Faturado no Mês: R$ {(dashboard?.faturamento || 0).toFixed(2)}</Text>{'\n'}
                  • Recebido em Caixa: R$ {(dashboard?.recebido || 0).toFixed(2)}{'\n'}
                  • A Receber em Fiados: R$ {(dashboard?.emAberto || 0).toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* Detalhamento de Entradas por Meio */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
            Entradas por Meio de Pagamento
          </Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {(dashboard?.recebimentoPorForma || []).map((f) => (
              <View
                key={f.forma}
                style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {f.forma === 'PIX' ? (
                    <QrCode size={20} color="#059669" />
                  ) : f.forma === 'DINHEIRO' ? (
                    <Banknote size={20} color="#0284c7" />
                  ) : f.forma === 'FIADO' ? (
                    <BookOpen size={20} color="#dc2626" />
                  ) : (
                    <CreditCard size={20} color="#f97316" />
                  )}
                  <Text style={[styles.payTitle, { color: colors.text }]}>{f.forma}</Text>
                </View>
                <Text style={[styles.payVal, { color: colors.text }]}>
                  R$ {f.valor.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Conteúdo Aba 2: Fiados */}
      {abaAtiva === 'fiados' && (
        <View style={{ flex: 1 }}>
          {/* Card Resumo Fiados */}
          <View style={[styles.fiadoTopBox, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
            <Text style={{ color: '#991b1b', fontSize: 12, fontWeight: '800' }}>
              TOTAL PENDENTE NA CADERNETA DE FIADOS
            </Text>
            <Text style={{ color: '#b91c1c', fontSize: 26, fontWeight: '900', marginTop: 2 }}>
              R$ {totalFiados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <FlatList
            data={fiados}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            renderItem={({ item }) => (
              <View style={[styles.fiadoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fiadoCliente, { color: colors.text }]}>
                    {item.cliente?.nome || 'Cliente'}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Pedido #{item.pedido?.numero} • Saldo: R$ {item.saldo.toFixed(2)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    Original: R$ {item.valorOriginal.toFixed(2)} | Já pago: R$ {item.valorPago.toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.quitarBtn, { backgroundColor: colors.success }]}
                  onPress={() => {
                    HapticService.light();
                    setSelectedFiadoQuitar(item);
                  }}
                  activeOpacity={0.8}
                >
                  <DollarSign size={16} color="#fff" />
                  <Text style={styles.quitarBtnText}>Receber</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ color: colors.textMuted }}>Nenhum fiado pendente! Todos em dia.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Conteúdo Aba 3: Despesas */}
      {abaAtiva === 'despesas' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={despesas}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            renderItem={({ item }) => {
              const dataFormatada = new Date(item.data).toLocaleDateString('pt-BR');
              return (
                <View style={[styles.despesaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.despesaDesc, { color: colors.text }]}>{item.descricao}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {item.categoria} • {dataFormatada} • {item.formaPagamento}
                    </Text>
                  </View>
                  <Text style={[styles.despesaVal, { color: colors.danger }]}>
                    - R$ {item.valor.toFixed(2)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ color: colors.textMuted }}>Nenhuma despesa lançada.</Text>
              </View>
            }
          />

          {/* Botão Nova Despesa */}
          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: colors.danger }]}
            onPress={() => {
              HapticService.medium();
              setShowNovaDespesaModal(true);
            }}
          >
            <Plus size={24} color="#fff" />
            <Text style={styles.fabBtnText}>NOVA DESPESA</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modais */}
      <NovaDespesaModal
        visible={showNovaDespesaModal}
        onClose={() => setShowNovaDespesaModal(false)}
        onSuccess={() => {
          setShowNovaDespesaModal(false);
          carregarDados();
        }}
      />

      <QuitarFiadoModal
        visible={!!selectedFiadoQuitar}
        fiado={selectedFiadoQuitar}
        onClose={() => setSelectedFiadoQuitar(null)}
        onSuccess={() => {
          setSelectedFiadoQuitar(null);
          carregarDados();
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
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 11,
    textAlign: 'center',
  },
  scrollBody: {
    padding: 16,
  },
  dreCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  dreBigNum: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  dreDivider: {
    borderTopWidth: 1,
    marginVertical: 14,
  },
  dreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  payTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  payVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  fiadoTopBox: {
    margin: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  fiadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  fiadoCliente: {
    fontSize: 15,
    fontWeight: '800',
  },
  quitarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  quitarBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  despesaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  despesaDesc: {
    fontSize: 14,
    fontWeight: '700',
  },
  despesaVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    elevation: 6,
  },
  fabBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  // Estilos Ganhos por Mês
  graficoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 155,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 110,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: 24,
  },
  barFill: {
    width: 20,
    borderRadius: 6,
  },
  barMonthBadge: {
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barMonthText: {
    fontSize: 10,
  },
  mesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  mesCardTitulo: {
    fontSize: 14,
    fontWeight: '800',
  },
  mesCardLucro: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  mesCardGrid: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
