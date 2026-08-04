import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <RootStatusBar />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(app)" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="confirm" />
            </Stack>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootStatusBar() {
  const { theme } = useTheme();
  const isDarkStyle = theme === 'dark' || theme === 'midnight';
  return <StatusBar style={isDarkStyle ? 'light' : 'dark'} />;
}
