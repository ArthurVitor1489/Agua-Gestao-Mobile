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
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ClientesService, ConfigService } from '../../database/dbService';
import { Cliente, RecompraOportunidade } from '../../database/models';
import { NovoClienteModal } from './NovoClienteModal';
import { HapticService } from '../../services/hapticService';
import {
  Search,
  Plus,
  Users,
  AlertCircle,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  Edit2,
} from 'lucide-react-native';

export const ClientesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();

  const [abaAtiva, setAbaAtiva] = useState<'clientes' | 'recompra'>('clientes');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [recompra, setRecompra] = useState<RecompraOportunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    try {
      setLoading(true);
      const cli = ClientesService.getClientes(search);
      const rec = ClientesService.getRecompraOportunidades();
      setClientes(cli);
      setRecompra(rec);
    } catch (e) {
      console.warn('Erro ao carregar clientes/recompra:', e);
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

  // 1-toque: Disparar mensagem de Recompra no WhatsApp
  const enviarMensagemRecompra = (item: RecompraOportunidade) => {
    HapticService.medium();
    const fone = item.whatsapp || item.telefone;
    if (!fone) {
      Alert.alert('Aviso', 'Cliente não possui número cadastrado.');
      return;
    }
    const cleanNum = fone.replace(/\D/g, '');
    const num = cleanNum.startsWith('55') ? cleanNum : `55${cleanNum}`;
    const cfg = ConfigService.getConfig();
    const empresaNome = cfg?.nomeDistribuidora || 'nossa distribuidora';

    const texto = `Olá ${item.nome}! Tudo bem? 💧\nJá faz ${item.diasSemComprar} dias desde o seu último pedido na ${empresaNome}. Seu garrafão de água já está acabando?\n\nResponda esta mensagem para enviarmos um novinho para você agora mesmo! 🚚`;

    Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.')
    );
  };

  const abrirTelefone = (fone?: string | null) => {
    if (!fone) return;
    HapticService.light();
    Linking.openURL(`tel:${fone.replace(/\D/g, '')}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Abas */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'clientes' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('clientes');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Users size={16} color={abaAtiva === 'clientes' ? colors.primary : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: abaAtiva === 'clientes' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'clientes' ? '800' : '600' },
              ]}
            >
              Clientes ({clientes.length})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, abaAtiva === 'recompra' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => {
            HapticService.light();
            setAbaAtiva('recompra');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={16} color={abaAtiva === 'recompra' ? colors.warning : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: abaAtiva === 'recompra' ? colors.warning : colors.textMuted, fontWeight: abaAtiva === 'recompra' ? '800' : '600' },
              ]}
            >
              Recompra Ativa ({recompra.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Aba 1: Lista de Clientes */}
      {abaAtiva === 'clientes' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBar}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar por nome, telefone ou rua..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  if (t.length === 0) carregarDados();
                }}
                onSubmitEditing={carregarDados}
              />
            </View>
          </View>

          <FlatList
            data={clientes}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            renderItem={({ item }) => (
              <View style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientCardNome, { color: colors.text }]}>{item.nome}</Text>
                  {item.telefone && (
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      Fone: {item.telefone}
                    </Text>
                  )}
                  {item.logradouro && (
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
                      {item.logradouro}, {item.numero || 'S/N'} • {item.bairro || ''}
                    </Text>
                  )}
                  {Boolean(item.precosEspeciais?.length) && (
                    <View style={styles.specialBadge}>
                      <Sparkles size={11} color="#0284c7" />
                      <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: 'bold' }}>
                        Preço Especial: R$ {item.precosEspeciais![0].preco.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Ações */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {/* Editar Cliente & Preço */}
                  <TouchableOpacity
                    style={[styles.iconAction, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      HapticService.light();
                      setClienteEmEdicao(item);
                      setShowNovoClienteModal(true);
                    }}
                  >
                    <Edit2 size={16} color={colors.primary} />
                  </TouchableOpacity>

                  {item.whatsapp && (
                    <TouchableOpacity
                      style={[styles.iconAction, { backgroundColor: '#dcfce7' }]}
                      onPress={() => {
                        HapticService.light();
                        const num = item.whatsapp!.replace(/\D/g, '');
                        Linking.openURL(`https://wa.me/55${num}`);
                      }}
                    >
                      <MessageCircle size={18} color="#15803d" />
                    </TouchableOpacity>
                  )}
                  {item.telefone && (
                    <TouchableOpacity
                      style={[styles.iconAction, { backgroundColor: colors.surface }]}
                      onPress={() => abrirTelefone(item.telefone)}
                    >
                      <Phone size={18} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ color: colors.textMuted }}>Nenhum cliente cadastrado.</Text>
              </View>
            }
          />

          {/* Botão Novo Cliente */}
          <TouchableOpacity
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              HapticService.medium();
              setClienteEmEdicao(null);
              setShowNovoClienteModal(true);
            }}
          >
            <Plus size={24} color="#fff" />
            <Text style={styles.fabBtnText}>NOVO CLIENTE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conteúdo Aba 2: Recompra Inteligente */}
      {abaAtiva === 'recompra' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.infoBanner, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <Text style={{ color: '#92400e', fontSize: 13, lineHeight: 18 }}>
              💡 O algoritmo analisa o histórico de pedidos de cada cliente e calcula o intervalo médio de consumo. Dispare mensagens no WhatsApp com 1 toque antes que ele compre do concorrente!
            </Text>
          </View>

          <FlatList
            data={recompra}
            keyExtractor={(item) => item.clienteId}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            renderItem={({ item }) => {
              const urgenciaCor =
                item.urgencia === 'ALTA'
                  ? colors.danger
                  : item.urgencia === 'MEDIA'
                  ? colors.warning
                  : colors.primary;

              return (
                <View style={[styles.recompraCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.recompraNome, { color: colors.text }]}>{item.nome}</Text>
                    <View style={[styles.urgenciaBadge, { backgroundColor: urgenciaCor + '20' }]}>
                      <Text style={[styles.urgenciaText, { color: urgenciaCor }]}>
                        {item.diasAtraso > 0 ? `${item.diasAtraso}d ATRASADO` : 'NO PRAZO'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recompraDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        Última compra: {item.diasSemComprar} dias atrás
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      Média: compra a cada {item.intervaloMedioDias} dias
                    </Text>
                  </View>

                  {item.bairro && (
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                      Bairro: {item.bairro}
                    </Text>
                  )}

                  {/* Botão de Disparo WhatsApp */}
                  <TouchableOpacity
                    style={[styles.whatsappRecompraBtn, { backgroundColor: '#25D366' }]}
                    onPress={() => enviarMensagemRecompra(item)}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={18} color="#fff" />
                    <Text style={styles.whatsappRecompraBtnText}>Cobrar / Enviar no WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ color: colors.textMuted }}>Nenhuma oportunidade de recompra pendente no momento.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Modal Cadastro/Edição de Cliente */}
      <NovoClienteModal
        visible={showNovoClienteModal}
        clienteParaEditar={clienteEmEdicao}
        onClose={() => {
          setShowNovoClienteModal(false);
          setClienteEmEdicao(null);
        }}
        onSuccess={() => {
          setShowNovoClienteModal(false);
          setClienteEmEdicao(null);
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
  searchBar: {
    padding: 16,
    paddingBottom: 4,
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
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  clientCardNome: {
    fontSize: 15,
    fontWeight: '800',
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    elevation: 6,
  },
  fabBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  infoBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recompraCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  recompraNome: {
    fontSize: 15,
    fontWeight: '800',
  },
  urgenciaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgenciaText: {
    fontSize: 11,
    fontWeight: '900',
  },
  recompraDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  whatsappRecompraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  whatsappRecompraBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
