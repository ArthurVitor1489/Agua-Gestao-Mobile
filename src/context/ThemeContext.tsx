import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { LocalStorage } from '../database/localStorage';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  surface: string;
}

export const lightColors: ThemeColors = {
  primary: '#0284c7', // Sky 600
  primaryLight: '#e0f2fe', // Sky 100
  primaryDark: '#0369a1', // Sky 700
  secondary: '#f97316', // Orange Gas
  accent: '#38bdf8', // Cyan
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  surface: '#f1f5f9',
};

export const darkColors: ThemeColors = {
  primary: '#38bdf8', // Sky 400
  primaryLight: '#082f49', // Sky 950
  primaryDark: '#0284c7',
  secondary: '#fb923c',
  accent: '#7dd3fc',
  background: '#0b1120',
  card: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#334155',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  surface: '#172033',
};

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    LocalStorage.getThemeMode().then(setThemeModeState);
  }, []);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    LocalStorage.setThemeMode(mode);
  };

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
