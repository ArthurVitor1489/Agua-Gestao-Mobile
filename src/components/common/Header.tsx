import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ConfigService } from '../../database/dbService';
import { ConfiguracoesModal } from '../../screens/configuracoes/ConfiguracoesModal';
import { HapticService } from '../../services/hapticService';
import { SupabaseClientService } from '../../services/supabaseClient';
import { CloudSyncService } from '../../services/cloudSyncService';
import {
  Building2,
  Sun,
  Moon,
  Settings,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Header: React.FC = () => {
  const { colors, isDark, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [nomeDistribuidora, setNomeDistribuidora] = useState('Água Gestão Pro');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'produtos' | 'distribuidora' | 'termos'>('produtos');

  const carregarConfig = () => {
    const cfg = ConfigService.getConfig();
    if (cfg?.nomeDistribuidora) {
      setNomeDistribuidora(cfg.nomeDistribuidora);
    }
  };

  useEffect(() => {
    carregarConfig();

    // Se já tiver nuvem configurada, tenta iniciar realtime
    if (SupabaseClientService.getConfig().isConfigured) {
      CloudSyncService.iniciarRealtime();
    }
  }, []);

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 32);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          paddingTop: safeTopPadding,
        },
      ]}
    >
      {/* Linha Superior: Distribuidora e Ações */}
      <View style={styles.topRow}>
        <View style={styles.empresaInfo}>
          <Building2 size={18} color={colors.primary} />
          <Text style={[styles.empresaNome, { color: colors.text }]} numberOfLines={1}>
            {nomeDistribuidora}
          </Text>
        </View>

        {/* Botões do Topo */}
        <View style={styles.actionsRow}>
          {/* Alternar Tema */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color={colors.text} />}
          </TouchableOpacity>

          {/* Botão de Configurações (⚙️) */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              HapticService.light();
              setModalInitialTab('produtos');
              setShowConfigModal(true);
            }}
            activeOpacity={0.7}
          >
            <Settings size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Configurações e Gestão de Produtos */}
      <ConfiguracoesModal
        visible={showConfigModal}
        initialTab={modalInitialTab}
        onClose={() => setShowConfigModal(false)}
        onConfigUpdated={carregarConfig}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  empresaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  empresaNome: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialBanner: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trialBannerText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  trialCtaBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trialCtaText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
