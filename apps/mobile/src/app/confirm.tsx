import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

export default function ConfirmScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<'confirmed' | 'failed' | 'pending'>(code ? 'pending' : 'confirmed');

  useEffect(() => {
    if (!code) return;
    let active = true;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) return;
      setStatus(error ? 'failed' : 'confirmed');
    });
    return () => { active = false; };
  }, [code]);

  return (
    <View style={styles.safeArea}>
      <View style={styles.card}>
        {status === 'pending' ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : status === 'confirmed' ? (
          <>
            <Text style={styles.title}>{t('confirmEmailConfirmedTitle')}</Text>
            <Text style={styles.description}>{t('confirmEmailConfirmedDescription')}</Text>
            <Button label={t('confirmContinueToLogin')} onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('confirmLinkExpiredTitle')}</Text>
            <Text style={styles.description}>{t('confirmLinkExpiredDescription')}</Text>
            <Button label={t('confirmContinueToLogin')} onPress={() => router.replace('/login')} />
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt, padding: 20 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  description: { fontSize: 14, color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
});
