import React, { useState } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Header } from '../components/common/Header';
import { HapticService } from '../services/hapticService';

// Telas de Autenticação & Paywall
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { PaywallScreen } from '../screens/subscription/PaywallScreen';

// Telas Principais do App
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
  const { user, isLoading } = useAuth();
  const { hasAccess, showPaywallModal, closePaywall } = useSubscription();
  const insets = useSafeAreaInsets();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const safeBottomPadding =
    insets.bottom > 0
      ? insets.bottom + (Platform.OS === 'android' ? 6 : 4)
      : Platform.OS === 'android'
      ? 26
      : 10;
  const tabBarHeight = 58 + safeBottomPadding;

  // Carregando sessão inicial
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Se não estiver logado, exibe Cadastro ou Login
  if (!user) {
    if (authMode === 'register') {
      return <RegisterScreen onNavigateToLogin={() => setAuthMode('login')} />;
    }
    return <LoginScreen onNavigateToRegister={() => setAuthMode('register')} />;
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
