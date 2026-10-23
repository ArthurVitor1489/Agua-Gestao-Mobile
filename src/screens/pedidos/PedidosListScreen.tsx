import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { PedidosService, ConfigService } from '../../database/dbService';
import { Pedido, StatusPedido } from '../../database/models';
import { NovoPedidoModal } from './NovoPedidoModal';
import { CupomFiscalPreview } from '../../components/CupomFiscalPreview';
import { HapticService } from '../../services/hapticService';
import {
  Search,
  Plus,
  Navigation,
  MessageCircle,
  Phone,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  CheckCheck,
} from 'lucide-react-native';

export const PedidosListScreen: React.FC = () => {
  const { colors } = useTheme();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [search, setSearch] = useState('');

  // Modais
  const [showNovoPedidoModal, setShowNovoPedidoModal] = useState(false);
  const [selectedPedidoCupom, setSelectedPedidoCupom] = useState<Pedido | null>(null);

  useEffect(() => {
    carregarPedidos();
  }, [statusFiltro, search]);

  const carregarPedidos = () => {
    try {
      setLoading(true);
      const s = statusFiltro === 'TODOS' ? undefined : (statusFiltro as StatusPedido);
      const data = PedidosService.getPedidos(s, search);
      setPedidos(data);
    } catch (e) {
      console.warn('Erro ao carregar pedidos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await HapticService.light();
    await carregarPedidos();
  };

  // 1-toque: Abrir Rota no Google Maps / Waze
  const abrirNavegacao = (p: Pedido) => {
    HapticService.light();
    const end = `${p.cliente?.logradouro || ''}, ${p.cliente?.numero || ''} - ${p.cliente?.bairro || ''}, ${p.cliente?.cidade || ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`;
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas.'));
  };

  // 1-toque: Conversa WhatsApp
  const abrirWhatsApp = (p: Pedido) => {
    HapticService.light();
    const fone = p.cliente?.whatsapp || p.cliente?.telefone;
    if (!fone) {
      Alert.alert('Aviso', 'Cliente não possui número cadastrado.');
      return;
    }
    const cleanNum = fone.replace(/\D/g, '');
    const num = cleanNum.startsWith('55') ? cleanNum : `55${cleanNum}`;
    const msg = `Olá ${p.cliente?.nome || ''}, somos da distribuidora! Seu pedido #${p.numero} está a caminho.`;
    Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.')
    );
  };

  // 1-toque: Ligar
  const ligarTelefone = (p: Pedido) => {
    HapticService.light();
    const fone = p.cliente?.telefone || p.cliente?.whatsapp;
    if (fone) {
      Linking.openURL(`tel:${fone.replace(/\D/g, '')}`);
    }
  };

  // 1-toque: Baixar / Receber Pagamento na Entrega
  const marcarEntregue = (p: Pedido) => {
    HapticService.medium();
    Alert.alert(
      'Confirmar Entrega',
      `Deseja marcar o Pedido #${p.numero} como ENTREGUE e registrar a baixa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Entrega',
          onPress: () => {
            PedidosService.atualizarStatus(p.id, 'ENTREGUE');
            HapticService.success();
            carregarPedidos();
          },
        },
      ]
    );
  };

  // Cancelar pedido com estorno de estoque
  const cancelarPedido = (p: Pedido) => {
    HapticService.heavy();
    Alert.alert(
      'Cancelar Pedido',
      `Tem certeza que deseja cancelar o Pedido #${p.numero}? Os produtos e vasilhames retornarão ao estoque imediatamente.`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: () => {
            PedidosService.cancelarPedido(p.id);
            HapticService.warning();
            carregarPedidos();
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: StatusPedido) => {
    switch (status) {
      case 'PENDENTE':
        return { label: 'Pendente', bg: '#fef3c7', text: '#b45309', icon: Clock };
      case 'EM_ANDAMENTO':
        return { label: 'Em Rota', bg: '#e0f2fe', text: '#0284c7', icon: Truck };
      case 'ENTREGUE':
        return { label: 'Entregue', bg: '#dcfce7', text: '#15803d', icon: CheckCheck };
      case 'CANCELADO':
        return { label: 'Cancelado', bg: '#fee2e2', text: '#b91c1c', icon: XCircle };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de Busca e Filtros */}
      <View style={styles.topFilterBar}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por cliente, pedido ou fone..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={(txt) => {
              setSearch(txt);
              if (txt.length === 0) carregarPedidos();
            }}
            onSubmitEditing={carregarPedidos}
            returnKeyType="search"
          />
        </View>

        {/* Chips de Status */}
        <View style={styles.chipsScroll}>
          {['TODOS', 'PENDENTE', 'EM_ANDAMENTO', 'ENTREGUE'].map((st) => {
            const isSel = statusFiltro === st;
            const label =
              st === 'TODOS'
                ? 'Todos'
                : st === 'PENDENTE'
                ? 'Pendentes'
                : st === 'EM_ANDAMENTO'
                ? 'Em Rota'
                : 'Entregues';
            return (
              <TouchableOpacity
                key={st}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSel ? colors.primary : colors.card,
                    borderColor: isSel ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  HapticService.light();
                  setStatusFiltro(st);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSel ? '#fff' : colors.textMuted, fontWeight: isSel ? '800' : '600' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Lista de Pedidos */}
      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          const BadgeIcon = badge.icon;
          const dataHora = new Date(item.data).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Linha Superior: Pedido #, Status e Hora */}
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.orderNumber, { color: colors.text }]}>#{item.numero}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <BadgeIcon size={12} color={badge.text} />
                    <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{dataHora}</Text>
              </View>

              {/* Dados do Cliente e Endereço */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {item.cliente?.nome || 'Consumidor Final'}
                </Text>
                {item.cliente?.logradouro ? (
                  <Text style={[styles.clientAddress, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.cliente.logradouro}, {item.cliente.numero || 'S/N'} • {item.cliente.bairro || ''}
                  </Text>
                ) : null}
              </View>

              {/* Resumo dos Itens */}
              <View style={[styles.itemsSummary, { backgroundColor: colors.surface }]}>
                <Text style={[styles.itemsSummaryText, { color: colors.text }]} numberOfLines={2}>
                  {item.itens
                    .map((it) => `${it.quantidade}x ${it.produto?.nome || 'Produto'}`)
                    .join(' • ')}
                </Text>
              </View>

              {/* Total e Forma de Pagamento */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceText, { color: colors.primary }]}>
                  R$ {item.total.toFixed(2)}
                </Text>
                <Text style={[styles.paymentMethodLabel, { color: colors.textMuted }]}>
                  {item.formaPagamento || 'A COMBINAR'}
                </Text>
              </View>

              {/* Barra de Ações Rápidas (1-toque) */}
              <View style={[styles.actionsBar, { borderTopColor: colors.border }]}>
                {/* Rota Maps */}
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: colors.surface }]}
                  onPress={() => abrirNavegacao(item)}
                >
                  <Navigation size={16} color={colors.primary} />
                  <Text style={[styles.quickActionText, { color: colors.text }]}>Rota</Text>
                </TouchableOpacity>

                {/* WhatsApp */}
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: '#dcfce7' }]}
                  onPress={() => abrirWhatsApp(item)}
                >
                  <MessageCircle size={16} color="#15803d" />
                  <Text style={[styles.quickActionText, { color: '#15803d' }]}>Whats</Text>
                </TouchableOpacity>

                {/* Imprimir Cupom Térmico */}
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    HapticService.light();
                    setSelectedPedidoCupom(item);
                  }}
                >
                  <Printer size={16} color={colors.text} />
                  <Text style={[styles.quickActionText, { color: colors.text }]}>Cupom</Text>
                </TouchableOpacity>

                {/* Baixar / Entregue */}
                {item.status !== 'ENTREGUE' && item.status !== 'CANCELADO' && (
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: colors.primary, flex: 1.2 }]}
                    onPress={() => marcarEntregue(item)}
                  >
                    <CheckCircle size={16} color="#fff" />
                    <Text style={[styles.quickActionText, { color: '#fff', fontWeight: 'bold' }]}>
                      Entregar
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Cancelar */}
                {item.status !== 'CANCELADO' && (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { backgroundColor: colors.surface }]}
                    onPress={() => cancelarPedido(item)}
                  >
                    <XCircle size={16} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>Nenhum pedido encontrado.</Text>
          </View>
        }
      />

      {/* Botão Flutuante: NOVO PEDIDO (PDV) */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          HapticService.medium();
          setShowNovoPedidoModal(true);
        }}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#fff" />
        <Text style={styles.fabBtnText}>NOVO PEDIDO (PDV)</Text>
      </TouchableOpacity>

      {/* Modal de Lançamento de Pedido PDV */}
      <NovoPedidoModal
        visible={showNovoPedidoModal}
        onClose={() => setShowNovoPedidoModal(false)}
        onSuccess={() => {
          setShowNovoPedidoModal(false);
          carregarPedidos();
        }}
      />

      {/* Modal de Impressão Térmica ESC/POS */}
      <CupomFiscalPreview
        visible={!!selectedPedidoCupom}
        pedido={selectedPedidoCupom}
        empresa={
          {
            nome: ConfigService.getConfig()?.nomeDistribuidora || 'Água Gestão Pro',
            whatsapp: ConfigService.getConfig()?.whatsapp || '',
            chavePix: ConfigService.getConfig()?.chavePix || '',
          } as any
        }
        onClose={() => setSelectedPedidoCupom(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topFilterBar: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '800',
  },
  clientAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  itemsSummary: {
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  itemsSummaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    flex: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
