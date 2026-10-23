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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { ConfigService, ProdutosService } from '../../database/dbService';
import { Produto } from '../../database/models';
import { ProdutoFormModal } from './ProdutoFormModal';
import { SuperAdminModal } from '../admin/SuperAdminModal';
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
  Copy,
  CheckCircle2,
} from 'lucide-react-native';

interface ConfiguracoesModalProps {
  visible: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
  initialTab?: 'produtos' | 'distribuidora' | 'nuvem' | 'licenca';
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

  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'distribuidora' | 'nuvem' | 'licenca'>(initialTab);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Dados da Distribuidora
  const [nomeDistribuidora, setNomeDistribuidora] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Form Banco de Dados / Supabase Nuvem
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [sincronizandoNuvem, setSincronizandoNuvem] = useState(false);
  const [statusConexaoNuvem, setStatusConexaoNuvem] = useState<'conectado' | 'desconectado' | 'pendente'>('desconectado');
  const [copiadoSql, setCopiadoSql] = useState(false);

  // Modal de Produto & Super Admin
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
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

      // Carregar dados da Nuvem Supabase
      const supCfg = SupabaseClientService.getConfig();
      setSupabaseUrl(supCfg.url);
      setSupabaseAnonKey(supCfg.anonKey);
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

  // Funções de Conexão Supabase
  const handleTestarConexao = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      Alert.alert('Atenção', 'Preencha a URL do projeto e a Chave Anon antes de testar.');
      return;
    }

    setTestandoConexao(true);
    await HapticService.light();

    try {
      const res = await SupabaseClientService.testConnection(supabaseUrl, supabaseAnonKey);
      if (res.success) {
        await HapticService.success();
        setStatusConexaoNuvem('conectado');
        Alert.alert('Sucesso na Conexão! 🚀', res.message);
      } else {
        await HapticService.error();
        setStatusConexaoNuvem('desconectado');
        Alert.alert('Falha na Conexão', res.message);
      }
    } catch (err: any) {
      await HapticService.error();
      Alert.alert('Erro', err?.message || 'Falha ao conectar.');
    } finally {
      setTestandoConexao(false);
    }
  };

  const handleSalvarConexaoSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      Alert.alert('Atenção', 'Preencha a URL do projeto e a Chave Anon.');
      return;
    }

    try {
      await HapticService.medium();
      SupabaseClientService.saveConfig(supabaseUrl, supabaseAnonKey);
      setStatusConexaoNuvem('conectado');
      await HapticService.success();

      Alert.alert(
        'Banco Conectado!',
        'Credenciais salvas com sucesso. Deseja realizar a sincronização completa agora?',
        [
          { text: 'Depois', style: 'cancel' },
          {
            text: 'Sincronizar Agora',
            onPress: () => handleSincronizarAgora(),
          },
        ]
      );
    } catch (e: any) {
      await HapticService.error();
      Alert.alert('Erro', e.message || 'Falha ao salvar configurações da nuvem.');
    }
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

  const handleCopiarSql = async () => {
    try {
      await HapticService.light();
      const sql = SupabaseClientService.getSupabaseSqlSchema();
      await Clipboard.setStringAsync(sql);
      await HapticService.success();
      setCopiadoSql(true);
      setTimeout(() => setCopiadoSql(false), 4000);
      Alert.alert(
        'Script SQL Copiado!',
        'O código SQL foi copiado para sua área de transferência. Abra o painel do seu projeto no Supabase, entre no SQL Editor, cole o script e clique em RUN.'
      );
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível copiar o script para a área de transferência.');
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
                  Produtos, Nuvem, dados da empresa e aplicativo
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

            {/* ABA BANCO DE DADOS / NUVEM */}
            <TouchableOpacity
              style={[styles.tabItem, abaAtiva === 'nuvem' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
              onPress={() => {
                HapticService.light();
                setAbaAtiva('nuvem');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Cloud size={14} color={abaAtiva === 'nuvem' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: abaAtiva === 'nuvem' ? colors.primary : colors.textMuted, fontWeight: abaAtiva === 'nuvem' ? '800' : '600' },
                  ]}
                >
                  Nuvem
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

          {/* ---------------- ABA 3: BANCO DE DADOS & NUVEM SUPABASE ---------------- */}
          {abaAtiva === 'nuvem' && (
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
              {/* Card de Status da Nuvem */}
              <View style={[styles.cloudStatusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            statusConexaoNuvem === 'conectado' ? '#10b981' : '#f59e0b',
                        },
                      ]}
                    />
                    <View>
                      <Text style={[styles.cloudStatusTitle, { color: colors.text }]}>
                        {statusConexaoNuvem === 'conectado' ? 'Nuvem Conectada' : 'Nuvem Não Conectada'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                        Última sincronização: {formatarUltimaSync(lastSyncTime)}
                      </Text>
                    </View>
                  </View>

                  <Database size={22} color={statusConexaoNuvem === 'conectado' ? '#10b981' : colors.textMuted} />
                </View>

                {/* Botão Sincronizar Agora */}
                <TouchableOpacity
                  style={[
                    styles.syncNowBtn,
                    {
                      backgroundColor: statusConexaoNuvem === 'conectado' ? colors.primary : colors.border,
                      opacity: statusConexaoNuvem === 'conectado' && !sincronizandoNuvem ? 1 : 0.7,
                    },
                  ]}
                  onPress={handleSincronizarAgora}
                  disabled={statusConexaoNuvem !== 'conectado' || sincronizandoNuvem}
                  activeOpacity={0.8}
                >
                  {sincronizandoNuvem ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <RefreshCw size={16} color="#fff" />
                      <Text style={styles.syncNowBtnText}>SINCRONIZAR TUDO AGORA</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Guia Rápido de Configuração */}
              <View style={[styles.guideCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Sparkles size={18} color="#166534" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>
                    Como Ativar o Banco Supabase (Grátis)
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#166534', lineHeight: 18 }}>
                  1. Crie uma conta gratuita em <Text style={{ fontWeight: 'bold' }}>supabase.com</Text> e abra seu projeto.{'\n'}
                  2. Clique no botão abaixo para copiar o script SQL completo do banco.{'\n'}
                  3. No painel do Supabase, entre em <Text style={{ fontWeight: 'bold' }}>SQL Editor</Text>, cole o script e clique em <Text style={{ fontWeight: 'bold' }}>Run</Text>.{'\n'}
                  4. Vá em <Text style={{ fontWeight: 'bold' }}>Project Settings → API</Text> e copie a <Text style={{ fontWeight: 'bold' }}>Project URL</Text> e a chave <Text style={{ fontWeight: 'bold' }}>anon public</Text> nos campos abaixo.
                </Text>

                {/* Botão Copiar Script SQL */}
                <TouchableOpacity
                  style={[
                    styles.copySqlBtn,
                    { backgroundColor: copiadoSql ? '#15803d' : '#16a34a' },
                  ]}
                  onPress={handleCopiarSql}
                  activeOpacity={0.8}
                >
                  {copiadoSql ? (
                    <>
                      <CheckCircle2 size={16} color="#fff" />
                      <Text style={styles.copySqlBtnText}>SCRIPT SQL COPIADO COM SUCESSO!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={16} color="#fff" />
                      <Text style={styles.copySqlBtnText}>COPIAR SCRIPT SQL DO BANCO</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Campos de Conexão */}
              <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
                URL do Projeto Supabase *
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://seu-projeto.supabase.co"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
                Chave Pública (anon / public key) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                    fontSize: 12,
                  },
                ]}
                value={supabaseAnonKey}
                onChangeText={setSupabaseAnonKey}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />

              {/* Botões de Ação */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.actionSecondaryBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                  onPress={handleTestarConexao}
                  disabled={testandoConexao}
                  activeOpacity={0.7}
                >
                  {testandoConexao ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={[styles.actionSecondaryText, { color: colors.text }]}>Testar Conexão</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPrimaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSalvarConexaoSupabase}
                  activeOpacity={0.8}
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.actionPrimaryText}>Salvar e Conectar</Text>
                </TouchableOpacity>
              </View>

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
