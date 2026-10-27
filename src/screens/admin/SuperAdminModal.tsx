import React, { useState, useEffect } from 'react';
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
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { CloudAdminService, DistribuidoraCliente } from '../../services/cloudAdminService';
import { HapticService } from '../../services/hapticService';
import {
  X,
  ShieldCheck,
  Building2,
  Users,
  Search,
  MessageCircle,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  RefreshCw,
  Key,
  Database,
  Sliders,
  Copy,
  ChevronRight,
  Sparkles,
  Trash2,
} from 'lucide-react-native';

interface SuperAdminModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();

  const [autenticado, setAutenticado] = useState(false);
  const [pinDigitado, setPinDigitado] = useState('');
  const [novoPin, setNovoPin] = useState('');
  const [distribuidoras, setDistribuidoras] = useState<DistribuidoraCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'TRIAL' | 'ATIVO' | 'BLOQUEADO'>('TODOS');
  const [abaAtiva, setAbaAtiva] = useState<'distribuidoras' | 'nuvem'>('distribuidoras');

  // Configuração da Nuvem
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');

  useEffect(() => {
    if (visible) {
      if (autenticado) {
        carregarDados();
      }
    } else {
      setPinDigitado('');
    }
  }, [visible, autenticado]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const lista = await CloudAdminService.listarTodasDistribuidoras();
      setDistribuidoras(lista);

      const cfg = CloudAdminService.getCloudConfig();
      setCloudUrl(cfg.url);
      setCloudApiKey(cfg.apiKey);
    } catch (e) {
      console.warn('Erro ao carregar dados do admin:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarPin = async () => {
    const currentPin = CloudAdminService.getAdminPin();
    if (pinDigitado.trim() === currentPin) {
      await HapticService.success();
      setAutenticado(true);
      carregarDados();
    } else {
      await HapticService.error();
      Alert.alert('Acesso Negado', 'PIN de Administrador incorreto.');
      setPinDigitado('');
    }
  };

  const handleSalvarNovoPin = () => {
    if (!novoPin || novoPin.trim().length < 4) {
      Alert.alert('Atenção', 'O novo PIN deve ter pelo menos 4 dígitos ou caracteres.');
      return;
    }
    CloudAdminService.saveAdminPin(novoPin.trim());
    Alert.alert('Sucesso', 'PIN do Painel Master atualizado com sucesso!');
    setNovoPin('');
  };

  const handleLiberarLicenca = async (dist: DistribuidoraCliente) => {
    Alert.alert(
      'Liberar Licença PRO',
      `Deseja liberar a licença vitalícia PRO para "${dist.nomeDistribuidora}"? O aplicativo ficará totalmente desbloqueado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar Acesso',
          style: 'default',
          onPress: async () => {
            const ok = await CloudAdminService.alterarStatusLicenca(dist.id, 'ATIVO', 'VITALICIO');
            if (ok) {
              await HapticService.success();
              carregarDados();
              Alert.alert('Sucesso! 🎉', `Licença PRO ativada para ${dist.nomeDistribuidora}!`);
            }
          },
        },
      ]
    );
  };

  const handleProrrogarTeste = async (dist: DistribuidoraCliente) => {
    const ok = await CloudAdminService.prorrogarTeste(dist.id, 30);
    if (ok) {
      await HapticService.success();
      carregarDados();
      Alert.alert('Teste Prorrogado', `Adicionado +30 dias de teste grátis para ${dist.nomeDistribuidora}!`);
    }
  };

  const handleBloquear = async (dist: DistribuidoraCliente) => {
    Alert.alert(
      'Bloquear Distribuidora',
      `Deseja bloquear o acesso de "${dist.nomeDistribuidora}"? O app dessa distribuidora será suspenso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            const ok = await CloudAdminService.alterarStatusLicenca(dist.id, 'BLOQUEADO', 'SUSPENSO');
            if (ok) {
              await HapticService.warning();
              carregarDados();
            }
          },
        },
      ]
    );
  };

  const handleExcluir = (dist: DistribuidoraCliente) => {
    Alert.alert('Excluir Registro', `Remover "${dist.nomeDistribuidora}" do painel master?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          CloudAdminService.excluirDistribuidora(dist.id);
          carregarDados();
        },
      },
    ]);
  };

  const handleAbrirWhatsApp = (dist: DistribuidoraCliente) => {
    if (!dist.whatsapp) {
      Alert.alert('Sem WhatsApp', 'Esta distribuidora não cadastrou um número de WhatsApp.');
      return;
    }
    const cleanPhone = dist.whatsapp.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const msg = encodeURIComponent(
      `Olá ${dist.responsavel}! Sou o Arthur, criador do aplicativo Água Gestão. Vi que você cadastrou a distribuidora ${dist.nomeDistribuidora}. Como está sendo sua experiência com o sistema? Precisa de alguma ajuda?`
    );
    Linking.openURL(`whatsapp://send?phone=${phoneWithCountry}&text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${msg}`);
    });
  };

  const handleSalvarNuvem = () => {
    CloudAdminService.saveCloudConfig(cloudUrl, cloudApiKey);
    HapticService.success();
    Alert.alert('Salvo', 'Configurações da nuvem atualizadas com sucesso!');
    carregarDados();
  };

  // Filtros
  const distribuidorasFiltradas = distribuidoras.filter((d) => {
    const matchSearch =
      d.nomeDistribuidora.toLowerCase().includes(search.toLowerCase()) ||
      d.responsavel.toLowerCase().includes(search.toLowerCase()) ||
      d.cidade.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filtroStatus === 'TODOS') return true;
    return d.status === filtroStatus;
  });

  // Métricas
  const total = distribuidoras.length;
  const ativas = distribuidoras.filter((d) => d.status === 'ATIVO').length;
  const trial = distribuidoras.filter((d) => d.status === 'TRIAL').length;
  const bloqueadas = distribuidoras.filter((d) => d.status === 'BLOQUEADO').length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.adminBadgeIcon, { backgroundColor: '#fef3c7' }]}>
                <ShieldCheck size={20} color="#b45309" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Painel Super Admin</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Controle Master de Distribuidoras & Licenças
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Se ainda não autenticado com PIN Master */}
          {!autenticado ? (
            <View style={styles.authBox}>
              <View style={[styles.lockCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Key size={32} color={colors.primary} />
              </View>
              <Text style={[styles.authTitle, { color: colors.text }]}>Painel Master</Text>
              <Text style={[styles.authSubtitle, { color: colors.textMuted }]}>
                Digite o PIN de segurança para gerenciar as distribuidoras clientes
              </Text>

              <TextInput
                style={[styles.pinInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Digite o PIN de segurança"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                keyboardType="numeric"
                maxLength={12}
                value={pinDigitado}
                onChangeText={setPinDigitado}
                onSubmitEditing={handleVerificarPin}
              />

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={handleVerificarPin}
              >
                <Text style={styles.loginBtnText}>Entrar no Painel Master</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Abas */}
              <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={[styles.tabItem, abaAtiva === 'distribuidoras' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setAbaAtiva('distribuidoras')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: abaAtiva === 'distribuidoras' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'distribuidoras' ? '800' : '600' },
                    ]}
                  >
                    Distribuidoras ({total})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, abaAtiva === 'nuvem' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setAbaAtiva('nuvem')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: abaAtiva === 'nuvem' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'nuvem' ? '800' : '600' },
                    ]}
                  >
                    Configurar Nuvem
                  </Text>
                </TouchableOpacity>
              </View>

              {abaAtiva === 'distribuidoras' ? (
                <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
                  {/* KPIs */}
                  <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>TOTAL CLIENTES</Text>
                      <Text style={[styles.kpiValue, { color: colors.text }]}>{total}</Text>
                    </View>

                    <View style={[styles.kpiCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                      <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>ATIVAS / PRO</Text>
                      <Text style={[styles.kpiValue, { color: '#15803d' }]}>{ativas}</Text>
                    </View>

                    <View style={[styles.kpiCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                      <Text style={{ fontSize: 11, color: '#b45309', fontWeight: '700' }}>EM TESTE</Text>
                      <Text style={[styles.kpiValue, { color: '#b45309' }]}>{trial}</Text>
                    </View>

                    <View style={[styles.kpiCard, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                      <Text style={{ fontSize: 11, color: '#b91c1c', fontWeight: '700' }}>BLOQUEADAS</Text>
                      <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>{bloqueadas}</Text>
                    </View>
                  </View>

                  {/* Busca e Atualização */}
                  <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
                    <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Search size={16} color={colors.textMuted} />
                      <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar por distribuidora, cidade, fone..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.refreshBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={carregarDados}
                    >
                      <RefreshCw size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Filtro Status */}
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                    {(['TODOS', 'TRIAL', 'ATIVO', 'BLOQUEADO'] as const).map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: filtroStatus === st ? colors.primary : colors.surface,
                            borderColor: filtroStatus === st ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setFiltroStatus(st)}
                      >
                        <Text style={[styles.chipText, { color: filtroStatus === st ? '#fff' : colors.textMuted }]}>
                          {st === 'TODOS' ? 'Todos' : st === 'TRIAL' ? 'Em Teste' : st === 'ATIVO' ? 'Ativos' : 'Bloqueados'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Lista de Distribuidoras */}
                  {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
                  ) : distribuidorasFiltradas.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Building2 size={40} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, marginTop: 10, textAlign: 'center' }}>
                        Nenhuma distribuidora encontrada. Quando alguém se cadastrar no app, ela aparecerá aqui!
                      </Text>
                    </View>
                  ) : (
                    distribuidorasFiltradas.map((dist) => (
                      <View
                        key={dist.id}
                        style={[styles.distCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        {/* Topo do Card */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[styles.distNome, { color: colors.text }]}>{dist.nomeDistribuidora}</Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                              👤 {dist.responsavel} {dist.cidade ? `• 📍 ${dist.cidade}/${dist.estado}` : ''}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>
                              ✉️ {dist.email} {dist.whatsapp ? `• 📱 ${dist.whatsapp}` : ''}
                            </Text>
                          </View>

                          {/* Badge de Status */}
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  dist.status === 'ATIVO' ? '#dcfce7' : dist.status === 'TRIAL' ? '#fef3c7' : '#fee2e2',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                color:
                                  dist.status === 'ATIVO' ? '#15803d' : dist.status === 'TRIAL' ? '#b45309' : '#b91c1c',
                              }}
                            >
                              {dist.status === 'ATIVO'
                                ? 'PRO ATIVO'
                                : dist.status === 'TRIAL'
                                ? `TESTE (${dist.diasRestantes}d)`
                                : 'BLOQUEADO'}
                            </Text>
                          </View>
                        </View>

                        {/* Barra de Ações Rápidas */}
                        <View style={[styles.distActionsRow, { borderTopColor: colors.border }]}>
                          {/* WhatsApp */}
                          <TouchableOpacity
                            style={[styles.btnAction, { backgroundColor: '#dcfce7' }]}
                            onPress={() => handleAbrirWhatsApp(dist)}
                          >
                            <MessageCircle size={14} color="#15803d" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d' }}>WhatsApp</Text>
                          </TouchableOpacity>

                          {/* Liberar Pro */}
                          {dist.status !== 'ATIVO' ? (
                            <TouchableOpacity
                              style={[styles.btnAction, { backgroundColor: colors.primary }]}
                              onPress={() => handleLiberarLicenca(dist)}
                            >
                              <Unlock size={14} color="#fff" />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Liberar PRO</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.btnAction, { backgroundColor: '#fee2e2' }]}
                              onPress={() => handleBloquear(dist)}
                            >
                              <Lock size={14} color="#b91c1c" />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#b91c1c' }}>Bloquear</Text>
                            </TouchableOpacity>
                          )}

                          {/* Prorrogar Teste */}
                          {dist.status === 'TRIAL' && (
                            <TouchableOpacity
                              style={[styles.btnAction, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                              onPress={() => handleProrrogarTeste(dist)}
                            >
                              <Clock size={14} color={colors.text} />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>+30 Dias</Text>
                            </TouchableOpacity>
                          )}

                          {/* Excluir */}
                          <TouchableOpacity
                            style={{ padding: 6 }}
                            onPress={() => handleExcluir(dist)}
                          >
                            <Trash2 size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  <View style={{ height: 40 }} />
                </ScrollView>
              ) : (
                /* Aba Nuvem / Supabase */
                <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
                  <View style={[styles.cloudInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Database size={24} color={colors.primary} />
                    <Text style={[styles.cloudInfoTitle, { color: colors.text }]}>
                      Sincronização com Nuvem Gratuita
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 18 }}>
                      O aplicativo funciona de forma 100% autônoma no celular do cliente. Para centralizar os dados no seu painel em tempo real, você pode conectar um banco de dados gratuito do Supabase ou similar.
                    </Text>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>URL da API / Supabase:</Text>
                  <TextInput
                    style={[styles.cloudInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="https://seu-projeto.supabase.co"
                    placeholderTextColor={colors.textMuted}
                    value={cloudUrl}
                    onChangeText={setCloudUrl}
                    autoCapitalize="none"
                  />

                  <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>Chave Pública (anon key):</Text>
                  <TextInput
                    style={[styles.cloudInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="eyJhbGciOi..."
                    placeholderTextColor={colors.textMuted}
                    value={cloudApiKey}
                    onChangeText={setCloudApiKey}
                    autoCapitalize="none"
                    secureTextEntry
                  />

                  <TouchableOpacity
                    style={[styles.saveCloudBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSalvarNuvem}
                  >
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={styles.saveCloudBtnText}>Salvar Configuração da Nuvem</Text>
                  </TouchableOpacity>

                  {/* Alterar PIN Master */}
                  <View style={[styles.cloudInfoCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}>
                    <Lock size={22} color={colors.primary} />
                    <Text style={[styles.cloudInfoTitle, { color: colors.text }]}>
                      Segurança do Painel Master
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 12 }}>
                      Altere o PIN numérico exigido para abrir este painel. O PIN padrão inicial é 2026.
                    </Text>

                    <TextInput
                      style={[styles.cloudInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="Novo PIN (ex: 4 a 8 dígitos)"
                      placeholderTextColor={colors.textMuted}
                      value={novoPin}
                      onChangeText={setNovoPin}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={12}
                    />

                    <TouchableOpacity
                      style={[styles.saveCloudBtn, { backgroundColor: '#10b981', marginTop: 12, marginBottom: 4 }]}
                      onPress={handleSalvarNovoPin}
                    >
                      <CheckCircle2 size={18} color="#fff" />
                      <Text style={styles.saveCloudBtnText}>Atualizar PIN Master</Text>
                    </TouchableOpacity>
                  </View>

                  {/* SQL Helper */}
                  <View style={[styles.sqlBox, { backgroundColor: '#1e293b' }]}>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                      TABELA SUPABASE (SQL PARA COPIAR E COLAR):
                    </Text>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                      {`create table distribuidoras (
  id text primary key,
  nome_distribuidora text,
  responsavel text,
  email text,
  whatsapp text,
  cidade text,
  estado text,
  status text default 'TRIAL',
  plano text default 'TRIAL_14_DIAS',
  trial_start_date text,
  created_at timestamp default now()
);`}
                    </Text>
                  </View>

                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </View>
          )}
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
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  adminBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  authBox: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  pinInput: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  loginBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
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
  bodyScroll: {
    padding: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  distCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  distNome: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cloudInfoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  cloudInfoTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  cloudInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveCloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 20,
  },
  saveCloudBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sqlBox: {
    padding: 14,
    borderRadius: 12,
  },
});
