import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  Share,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { ConfigService, ProdutosService } from '../../database/dbService';
import { Produto } from '../../database/models';
import { ProdutoFormModal } from './ProdutoFormModal';
import { SuperAdminModal } from '../admin/SuperAdminModal';
import { TermosPrivacidadeModal } from '../legal/TermosPrivacidadeModal';
import { HapticService } from '../../services/hapticService';
import { SupabaseClientService } from '../../services/supabaseClient';
import { CloudSyncService } from '../../services/cloudSyncService';
import {
  X,
  Settings,
  Package,
  Plus,
  Edit2,
  Trash2,
  Building2,
  ShieldCheck,
  Sparkles,
  Check,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
  FileText,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';

interface ConfiguracoesModalProps {
  visible: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
  initialTab?: 'produtos' | 'distribuidora' | 'termos' | 'licenca';
}

export const ConfiguracoesModal: React.FC<ConfiguracoesModalProps> = ({
  visible,
  onClose,
  onConfigUpdated,
  initialTab = 'produtos',
}) => {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const { isTrialActive, daysRemaining, isSubscribed, openPaywall } = useSubscription();

  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'distribuidora' | 'termos' | 'licenca'>(initialTab);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Dados da Distribuidora
  const [nomeDistribuidora, setNomeDistribuidora] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Status de Sincronização
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [sincronizandoNuvem, setSincronizandoNuvem] = useState(false);
  const [statusConexaoNuvem, setStatusConexaoNuvem] = useState<'conectado' | 'desconectado' | 'pendente'>('desconectado');

  // Modal de Produto, Super Admin & Termos
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showTermosModal, setShowTermosModal] = useState(false);
  const [termosInitialTab, setTermosInitialTab] = useState<'termos' | 'privacidade' | 'exclusao'>('termos');
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);

  // Easter egg: 5 toques seguidos na versão para abrir o Painel Admin Master
  const adminTapCountRef = useRef(0);
  const lastAdminTapRef = useRef(0);

  const handleAdminEasterEgg = () => {
    const now = Date.now();
    if (now - lastAdminTapRef.current > 2000) {
      adminTapCountRef.current = 0;
    }
    lastAdminTapRef.current = now;
    adminTapCountRef.current += 1;

    HapticService.light();

    if (adminTapCountRef.current >= 5) {
      adminTapCountRef.current = 0;
      HapticService.success();
      setShowSuperAdminModal(true);
    }
  };

  useEffect(() => {
    if (visible) {
      if (initialTab) {
        setAbaAtiva(initialTab);
      }
      carregarDados();
    }
  }, [visible, initialTab]);

  const carregarDados = () => {
    try {
      setLoading(true);
      const prods = ProdutosService.getProdutos();
      setProdutos(prods);

      const cfg = ConfigService.getConfig();
      if (cfg) {
        setNomeDistribuidora(cfg.nomeDistribuidora || '');
        setWhatsapp(cfg.whatsapp || '');
        setChavePix(cfg.chavePix || '');
        setCidade(cfg.cidade || '');
        setEstado(cfg.estado || 'SP');
      }

      // Carregar dados de Sincronização
      const supCfg = SupabaseClientService.getConfig();
      setLastSyncTime(supCfg.lastSyncAt);
      setStatusConexaoNuvem(supCfg.isConfigured ? 'conectado' : 'desconectado');
    } catch (e) {
      console.warn('Erro ao carregar configurações:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarConfig = async () => {
    if (!nomeDistribuidora.trim()) {
      Alert.alert('Atenção', 'Informe o nome da distribuidora.');
      return;
    }

    try {
      setSalvandoConfig(true);
      await HapticService.medium();

      ConfigService.saveConfig({
        nomeDistribuidora: nomeDistribuidora.trim(),
        whatsapp: whatsapp.trim(),
        chavePix: chavePix.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
      });

      await HapticService.success();
      Alert.alert('Sucesso!', 'Dados da distribuidora atualizados com sucesso.');
      if (onConfigUpdated) onConfigUpdated();
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao salvar dados');
    } finally {
      setSalvandoConfig(false);
    }
  };

  const handleExcluirProduto = (prod: Produto) => {
    Alert.alert('Excluir Produto', `Deseja realmente remover o produto "${prod.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await HapticService.medium();
          ProdutosService.excluirProduto(prod.id);
          await HapticService.success();
          carregarDados();
        },
      },
    ]);
  };

  const handleSincronizarAgora = async () => {
    setSincronizandoNuvem(true);
    await HapticService.medium();

    try {
      const res = await CloudSyncService.sincronizarTudo();
      if (res.success) {
        await HapticService.success();
        setLastSyncTime(res.timestamp);
        setStatusConexaoNuvem('conectado');
        carregarDados();
        Alert.alert('Sincronização Concluída! ☁️', res.message);
        if (onConfigUpdated) onConfigUpdated();
      } else {
        await HapticService.error();
        Alert.alert('Aviso de Sincronização', res.message);
      }
    } catch (err: any) {
      await HapticService.error();
      Alert.alert('Erro', err?.message || 'Falha durante a sincronização.');
    } finally {
      setSincronizandoNuvem(false);
    }
  };

  const formatarUltimaSync = (isoString: string | null) => {
    if (!isoString) return 'Nunca sincronizado';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Settings size={22} color={colors.primary} />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Produtos, distribuidora, segurança e licença
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Abas Internas */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
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
                Águas ({produtos.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, abaAtiva === 'distribuidora' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
              onPress={() => {
                HapticService.light();
                setAbaAtiva('distribuidora');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: abaAtiva === 'distribuidora' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'distribuidora' ? '800' : '600' },
                ]}
              >
                Distribuidora
              </Text>
            </TouchableOpacity>

            {/* ABA TERMOS & PRIVACIDADE */}
            <TouchableOpacity
              style={[styles.tabItem, abaAtiva === 'termos' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
              onPress={() => {
                HapticService.light();
                setAbaAtiva('termos');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} color={abaAtiva === 'termos' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: abaAtiva === 'termos' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'termos' ? '800' : '600' },
                  ]}
                >
                  Privacidade
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, abaAtiva === 'licenca' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
              onPress={() => {
                HapticService.light();
                setAbaAtiva('licenca');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: abaAtiva === 'licenca' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'licenca' ? '800' : '600' },
                ]}
              >
                Assinatura
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------------- ABA 1: PRODUTOS ---------------- */}
          {abaAtiva === 'produtos' && (
            <View style={{ flex: 1 }}>
              <View style={styles.produtosHeader}>
                <TouchableOpacity
                  style={[styles.novoProdBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    HapticService.medium();
                    setProdutoEmEdicao(null);
                    setShowProdutoModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color="#fff" />
                  <Text style={styles.novoProdBtnText}>CADASTRAR NOVO PRODUTO</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={produtos}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <View style={[styles.prodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.prodCardNome, { color: colors.text }]}>{item.nome}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        Preço de Venda: <Text style={{ fontWeight: '800', color: colors.success }}>R$ {item.precoVenda.toFixed(2)}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Estoque: {item.estoque?.quantidadeAtual || 0} un • Categoria: {item.categoria}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => {
                          HapticService.light();
                          setProdutoEmEdicao(item);
                          setShowProdutoModal(true);
                        }}
                      >
                        <Edit2 size={16} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                        onPress={() => handleExcluirProduto(item)}
                      >
                        <Trash2 size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Package size={36} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, marginTop: 8 }}>
                      Nenhum produto cadastrado no momento.
                    </Text>
                  </View>
                }
              />
            </View>
          )}

          {/* ---------------- ABA 2: DADOS DA DISTRIBUIDORA ---------------- */}
          {abaAtiva === 'distribuidora' && (
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.text }]}>Nome da Distribuidora *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={nomeDistribuidora}
                onChangeText={setNomeDistribuidora}
                placeholder="Ex: Distribuidora Água Pura"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>WhatsApp / Telefone de Contato</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                keyboardType="phone-pad"
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="(83) 99999-9999"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Chave PIX da Empresa</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                Aparece no cupom impresso e nas cobranças automáticas.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={chavePix}
                onChangeText={setChavePix}
                placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Cidade</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={cidade}
                    onChangeText={setCidade}
                    placeholder="Sua cidade"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text }]}>UF</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={estado}
                    onChangeText={setEstado}
                    placeholder="PB"
                    maxLength={2}
                    autoCapitalize="characters"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.salvarDadosBtn, { backgroundColor: colors.primary }]}
                onPress={handleSalvarConfig}
                disabled={salvandoConfig}
                activeOpacity={0.8}
              >
                {salvandoConfig ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.salvarDadosText}>Salvar Dados da Distribuidora</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Botão Sair da Conta (Logout) */}
              <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: '#fee2e2' }]}
                onPress={() => {
                  Alert.alert('Sair da Conta', 'Deseja realmente sair da sua conta?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Sair',
                      style: 'destructive',
                      onPress: () => {
                        onClose();
                        logout();
                      },
                    },
                  ]);
                }}
              >
                <LogOut size={16} color={colors.danger} />
                <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>
                  Sair da Conta (Fazer Logout)
                </Text>
              </TouchableOpacity>

              {/* Versão do Programa (Toque 5x para abrir painel admin) */}
              <TouchableOpacity
                onPress={handleAdminEasterEgg}
                activeOpacity={0.7}
                style={styles.versionClickable}
              >
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                  Água Gestão Pro • Versão 1.0.0
                </Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* ---------------- ABA 3: TERMOS, PRIVACIDADE & SEGURANÇA ---------------- */}
          {abaAtiva === 'termos' && (
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
              {/* Card de Segurança dos Dados */}
              <View style={[styles.cloudStatusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={24} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cloudStatusTitle, { color: colors.text }]}>
                      Privacidade & Segurança
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      Seus dados são protegidos com isolamento exclusivo por distribuidora e criptografia local.
                    </Text>
                  </View>
                </View>

                {/* Status da Sincronização */}
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>ÚLTIMO BACKUP / SINCRONIZAÇÃO</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                      {formatarUltimaSync(lastSyncTime)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.syncNowBtn,
                      {
                        backgroundColor: colors.primary,
                        marginTop: 0,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      },
                    ]}
                    onPress={handleSincronizarAgora}
                    disabled={sincronizandoNuvem}
                    activeOpacity={0.8}
                  >
                    {sincronizandoNuvem ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <RefreshCw size={14} color="#fff" />
                        <Text style={[styles.syncNowBtnText, { fontSize: 11 }]}>Sincronizar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Seção Documentos Jurídicos e Políticas */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 10, letterSpacing: 0.5 }}>
                Conformidade Legal & Termos
              </Text>

              {/* Botão Termos de Uso */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
                onPress={() => {
                  setTermosInitialTab('termos');
                  setShowTermosModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FileText size={20} color={colors.primary} />
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Termos de Uso</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      Contrato de licença e condições de utilização
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Botão Política de Privacidade */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
                onPress={() => {
                  setTermosInitialTab('privacidade');
                  setShowTermosModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ShieldCheck size={20} color="#059669" />
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Política de Privacidade</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      Em conformidade com a LGPD e Google Play
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Seção Exclusão de Conta (Obrigatório Google Play) */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 10, letterSpacing: 0.5 }}>
                Gerenciamento de Conta
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: '#fecaca',
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => {
                  setTermosInitialTab('exclusao');
                  setShowTermosModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Trash2 size={20} color={colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.danger }}>
                      Excluir Minha Conta e Dados
                    </Text>
                    <Text style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>
                      Apaga permanentemente todos os clientes, vendas e configurações
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.danger} />
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* ---------------- ABA 4: LICENÇA E ASSINATURA ---------------- */}
          {abaAtiva === 'licenca' && (
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.licenseBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {isSubscribed ? (
                  <>
                    <ShieldCheck size={32} color={colors.success} />
                    <Text style={[styles.licenseTitle, { color: colors.success }]}>Licença Pro Ativa</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                      Sua assinatura Google Play Store está ativa e sem restrições.
                    </Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={32} color="#b45309" />
                    <Text style={[styles.licenseTitle, { color: '#b45309' }]}>Período de Teste Grátis</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#92400e', marginTop: 4 }}>
                      {daysRemaining !== null ? `${daysRemaining} dias restantes` : '14 dias'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                      Aproveite todos os recursos liberados. Quando o teste expirar, você poderá assinar por apenas R$ 39,90/mês.
                    </Text>
                    <TouchableOpacity
                      style={[styles.assinarBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        onClose();
                        openPaywall();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.assinarBtnText}>VER PLANOS GOOGLE PLAY</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Informações Técnicas */}
              <View style={[styles.techInfoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.techTitle, { color: colors.text }]}>Informações do Aplicativo</Text>
                <TouchableOpacity
                  onPress={handleAdminEasterEgg}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    • Versão: <Text style={{ fontWeight: 'bold', color: colors.text }}>1.0.0 Pro (Google Play Edition)</Text>
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  • Banco de Dados: <Text style={{ fontWeight: 'bold', color: colors.text }}>SQLite Local (100% Offline) + Nuvem Supabase</Text>
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  • Impressão Térmica: <Text style={{ fontWeight: 'bold', color: colors.text }}>ESC/POS 58mm / 80mm</Text>
                </Text>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* Modal de Criar/Editar Produto */}
          <ProdutoFormModal
            visible={showProdutoModal}
            produtoParaEditar={produtoEmEdicao}
            onClose={() => {
              setShowProdutoModal(false);
              setProdutoEmEdicao(null);
            }}
            onSuccess={() => {
              setShowProdutoModal(false);
              setProdutoEmEdicao(null);
              carregarDados();
            }}
          />

          {/* Modal Super Admin Master */}
          <SuperAdminModal
            visible={showSuperAdminModal}
            onClose={() => setShowSuperAdminModal(false)}
          />

          {/* Modal Termos de Uso e Política de Privacidade */}
          <TermosPrivacidadeModal
            visible={showTermosModal}
            onClose={() => setShowTermosModal(false)}
            initialTab={termosInitialTab}
          />
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
  },
  produtosHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  novoProdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  novoProdBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  prodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  prodCardNome: {
    fontSize: 15,
    fontWeight: '800',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  bodyScroll: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  salvarDadosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 20,
  },
  salvarDadosText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  versionClickable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
  },
  licenseBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  licenseTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },
  assinarBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  assinarBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  techInfoBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  techTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  cloudStatusCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cloudStatusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  syncNowBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  syncNowBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  guideCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  copySqlBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  copySqlBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  actionSecondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionPrimaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
