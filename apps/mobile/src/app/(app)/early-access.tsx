import { Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { getPublicProfile } from '@/lib/profiles';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

export default function EarlyAccessScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supporter, setSupporter] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) {
      setLoading(false);
      return;
    }
    getPublicProfile(session.user.id).then((profile) => {
      if (!active) return;
      setSupporter(profile?.supporter === true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [session?.user.id]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerEarlyAccess')} />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : supporter ? (
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <Sparkles color={colors.supporterGold} size={18} />
              <Text style={styles.title}>{t('earlyAccessSupporterTitle')}</Text>
            </View>
            <Text style={styles.body}>{t('earlyAccessHasAccess')}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{t('earlyAccessRequiredTitle')}</Text>
            <Text style={styles.body}>{t('earlyAccessRequiredBody')}</Text>
            <Button label={t('earlyAccessViewSupporter')} onPress={() => router.push('/supporter')} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 14 },
  card: { padding: 18, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, gap: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  body: { color: colors.textFaint, fontSize: 14, lineHeight: 20 },
});
