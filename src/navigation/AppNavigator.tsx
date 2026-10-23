import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { ConfigService } from '../database/dbService';
import { Header } from '../components/common/Header';
import { HapticService } from '../services/hapticService';

// Telas
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PaywallScreen } from '../screens/subscription/PaywallScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PedidosListScreen } from '../screens/pedidos/PedidosListScreen';
import { EstoqueScreen } from '../screens/estoque/EstoqueScreen';
import { ClientesScreen } from '../screens/clientes/ClientesScreen';
import { FinanceiroScreen } from '../screens/financeiro/FinanceiroScreen';

// Ícones
import {
  LayoutDashboard,
  ShoppingBag,
  Cylinder,
  Users,
  Wallet,
} from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { hasAccess, showPaywallModal, closePaywall, refreshSubscription } = useSubscription();
  const insets = useSafeAreaInsets();

  const [hasConfig, setHasConfig] = useState<boolean>(() => !!ConfigService.getConfig());

  const safeBottomPadding =
    insets.bottom > 0
      ? insets.bottom + (Platform.OS === 'android' ? 6 : 4)
      : Platform.OS === 'android'
      ? 26
      : 10;
  const tabBarHeight = 58 + safeBottomPadding;

  // Primeiro Acesso: Exibe Onboarding para configurar Distribuidora
  if (!hasConfig) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setHasConfig(true);
          refreshSubscription();
        }}
      />
    );
  }

  // Se o período de teste de 14 dias expirou e não possui assinatura
  if (!hasAccess) {
    return <PaywallScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              height: tabBarHeight,
              paddingBottom: safeBottomPadding,
              paddingTop: 8,
              elevation: 12,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700',
              marginTop: 2,
            },
          }}
          screenListeners={{
            tabPress: () => {
              HapticService.light();
            },
          }}
        >
          <Tab.Screen
            name="DashboardTab"
            component={DashboardScreen}
            options={{
              tabBarLabel: 'Dashboard',
              tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
            }}
          />

          <Tab.Screen
            name="PedidosTab"
            component={PedidosListScreen}
            options={{
              tabBarLabel: 'Pedidos / PDV',
              tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
            }}
          />

          <Tab.Screen
            name="EstoqueTab"
            component={EstoqueScreen}
            options={{
              tabBarLabel: 'Estoque',
              tabBarIcon: ({ color, size }) => <Cylinder size={size} color={color} />,
            }}
          />

          <Tab.Screen
            name="ClientesTab"
            component={ClientesScreen}
            options={{
              tabBarLabel: 'Clientes',
              tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
            }}
          />

          <Tab.Screen
            name="FinanceiroTab"
            component={FinanceiroScreen}
            options={{
              tabBarLabel: 'Financeiro',
              tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>

      {/* Modal Paywall sob demanda */}
      <PaywallScreen visible={showPaywallModal} onClose={closePaywall} />
    </View>
  );
};
