import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { DashboardService, ClientesService } from '../../database/dbService';
import { DashboardData, RecompraOportunidade } from '../../database/models';
import { HapticService } from '../../services/hapticService';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Cylinder,
  Users,
  AlertTriangle,
  CreditCard,
  DollarSign,
  QrCode,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | 'mes'>('hoje');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [recompraAtrasados, setRecompraAtrasados] = useState<RecompraOportunidade[]>([]);

  // Recarrega os indicadores instantaneamente sempre que o usuário abre a aba Dashboard
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [periodo])
  );

  useEffect(() => {
    loadDashboard();
  }, [periodo]);

  const loadDashboard = () => {
    try {
      const dash = DashboardService.getDashboard(periodo);
      const recompra = ClientesService.getRecompraOportunidades();
      setData(dash);
      setRecompraAtrasados(recompra);
    } catch (e) {
      console.warn('Erro ao carregar dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await HapticService.light();
    await loadDashboard();
  };

  const selectPeriodo = (p: 'hoje' | '7dias' | 'mes') => {
    HapticService.light();
    setPeriodo(p);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Seletor de Período Ergonômico */}
      <View style={styles.periodRow}>
        {(['hoje', '7dias', 'mes'] as const).map((p) => {
          const isSelected = periodo === p;
          const label = p === 'hoje' ? 'Hoje' : p === '7dias' ? 'Últimos 7 dias' : 'Mês Atual';
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => selectPeriodo(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: isSelected ? '#fff' : colors.textMuted, fontWeight: isSelected ? '800' : '600' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>Atualizando dados...</Text>
        </View>
      ) : (
        <>
          {/* Card Principal: Faturamento & Recebimentos */}
          <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                  FATURAMENTO ({periodo.toUpperCase()})
                </Text>
                <Text style={[styles.mainValue, { color: colors.text }]}>
                  R$ {(data?.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
                <TrendingUp size={24} color={colors.primary} />
              </View>
            </View>

            <View style={[styles.cardDivider, { borderTopColor: colors.border }]} />

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ArrowUpRight size={16} color={colors.success} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Recebido em Caixa</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  R$ {(data?.recebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ArrowDownRight size={16} color={colors.warning} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>A Receber / Fiados</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  R$ {(data?.emAberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Grid de Operação: Pedidos e Estoque de Garrafões */}
          <View style={styles.gridRow}>
            {/* Card Pedidos */}
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('PedidosTab')}
              activeOpacity={0.8}
            >
              <View style={styles.gridHeader}>
                <ShoppingBag size={20} color={colors.primary} />
                <Text style={[styles.gridTitle, { color: colors.text }]}>Pedidos</Text>
              </View>
              <Text style={[styles.gridBigNum, { color: colors.primary }]}>
                {data?.pedidosRealizados || 0}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Clock size={14} color={colors.warning} />
                <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>
                  {data?.pedidosPendentes || 0} Pendentes
                </Text>
              </View>
            </TouchableOpacity>

            {/* Card Vasilhames / Garrafões */}
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('EstoqueTab')}
              activeOpacity={0.8}
            >
              <View style={styles.gridHeader}>
                <Cylinder size={20} color={colors.secondary} />
                <Text style={[styles.gridTitle, { color: colors.text }]}>Vasilhames</Text>
              </View>
              <Text style={[styles.gridBigNum, { color: colors.success }]}>
                {data?.garrafoesCheios || 0}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Cheios</Text>
              {Boolean((data?.garrafoesDanificados || 0) > 0) && (
                <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                  {data?.garrafoesDanificados} avarias/descarte
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Alerta de Recompra Inteligente (Pós-Venda) */}
          <TouchableOpacity
            style={[
              styles.alertCard,
              {
                backgroundColor: recompraAtrasados.length > 0 ? '#fef3c7' : colors.card,
                borderColor: recompraAtrasados.length > 0 ? '#f59e0b' : colors.border,
              },
            ]}
            onPress={() => navigation.navigate('ClientesTab', { screen: 'Recompra' })}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.alertIconBox,
                  { backgroundColor: recompraAtrasados.length > 0 ? '#fde68a' : colors.surface },
                ]}
              >
                <AlertTriangle
                  size={22}
                  color={recompraAtrasados.length > 0 ? '#b45309' : colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.alertTitle,
                    { color: recompraAtrasados.length > 0 ? '#92400e' : colors.text },
                  ]}
                >
                  Inteligência de Recompra
                </Text>
                <Text
                  style={[
                    styles.alertDesc,
                    { color: recompraAtrasados.length > 0 ? '#b45309' : colors.textMuted },
                  ]}
                >
                  {recompraAtrasados.length > 0
                    ? `${recompraAtrasados.length} cliente(s) com consumo atrasado! Toque para cobrar no WhatsApp.`
                    : 'Todos os clientes ativos estão dentro da média de consumo.'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Recebimentos por Meio de Pagamento */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recebimentos por Meio</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {(data?.recebimentoPorForma || []).map((f) => (
                <View key={f.forma} style={styles.paymentMethodRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {f.forma === 'PIX' ? (
                      <QrCode size={18} color="#059669" />
                    ) : f.forma === 'DINHEIRO' ? (
                      <DollarSign size={18} color="#0284c7" />
                    ) : f.forma === 'FIADO' ? (
                      <Clock size={18} color="#dc2626" />
                    ) : (
                      <CreditCard size={18} color="#f97316" />
                    )}
                    <Text style={[styles.paymentMethodText, { color: colors.text }]}>{f.forma}</Text>
                  </View>
                  <Text style={[styles.paymentMethodVal, { color: colors.text }]}>
                    R$ {f.valor.toFixed(2)} ({f.quantidade}x)
                  </Text>
                </View>
              ))}
              {(!data?.recebimentoPorForma || data.recebimentoPorForma.length === 0) && (
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 8 }}>
                  Nenhum recebimento registrado neste período.
                </Text>
              )}
            </View>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 13,
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    borderTopWidth: 1,
    marginVertical: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  gridCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  gridBigNum: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  vasilhamesStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  gridSmallNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  alertIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  alertDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentMethodVal: {
    fontSize: 14,
    fontWeight: '700',
  },
});
