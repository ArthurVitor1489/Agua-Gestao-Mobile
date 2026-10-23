import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { FinanceiroService, DashboardService } from '../../database/dbService';
import { Fiado, Despesa, DashboardData } from '../../database/models';
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
} from 'lucide-react-native';

export const FinanceiroScreen: React.FC = () => {
  const { colors } = useTheme();

  const [abaAtiva, setAbaAtiva] = useState<'caixa' | 'fiados' | 'despesas'>('caixa');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [totalFiados, setTotalFiados] = useState(0);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [totalDespesas, setTotalDespesas] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modais
  const [showNovaDespesaModal, setShowNovaDespesaModal] = useState(false);
  const [selectedFiadoQuitar, setSelectedFiadoQuitar] = useState<Fiado | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    try {
      setLoading(true);
      const dash = DashboardService.getDashboard('mes');
      const fList = FinanceiroService.getFiados();
      const totFiados = fList.reduce((acc, f) => acc + f.saldo, 0);
      const dList = FinanceiroService.getDespesas();
      const totDesp = dList.reduce((acc, d) => acc + d.valor, 0);

      setDashboard(dash);
      setFiados(fList);
      setTotalFiados(totFiados);
      setDespesas(dList);
      setTotalDespesas(totDesp);
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

  const saldoLiquido = (dashboard?.recebido || 0) - totalDespesas;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Abas */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
            Caderneta Fiados ({fiados.length})
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
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Despesas de Rota</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.danger }}>
                  - R$ {totalDespesas.toFixed(2)}
                </Text>
              </View>
            </View>
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
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
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
});
