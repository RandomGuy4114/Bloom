import { Redirect, Tabs } from 'expo-router';
import { CalendarDays, House, Plus, Settings, Users } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function ProtectedLayout() {
  const { loading, session } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.tabInactive,
        animation: "shift",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSoft,
          height: 68,
          paddingBottom: 7,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, focused, size }) => (
            <House color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: t('tabCommunities'),
          tabBarIcon: ({ color, focused, size }) => (
            <Users color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabCreate'),
          tabBarIcon: ({ color, focused, size }) => (
            <Plus color={color} size={size} strokeWidth={focused ? 2.75 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabCalendar'),
          tabBarIcon: ({ color, focused, size }) => (
            <CalendarDays color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color, focused, size }) => (
            <Settings color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Pushed screens reachable via router.push, hidden from the tab bar */}
      <Tabs.Screen name="connect" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="supporter" options={{ href: null }} />
      <Tabs.Screen name="early-access" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="post" options={{ href: null }} />
      <Tabs.Screen name="legal" options={{ href: null }} />
    </Tabs>
  );
}
