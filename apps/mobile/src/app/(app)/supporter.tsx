import { Star } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

type SupporterProfile = {
  patreon_membership_status: string | null;
  patreon_user_id: string | null;
  supporter: boolean | null;
  supporter_verified_at: string | null;
};

type SupporterState = 'active' | 'linked' | 'none';

const PATREON_AUTHORIZATION_ORIGIN = 'https://www.patreon.com';
const REDIRECT_URL = 'mobile://supporter';

function resolveState(profile: SupporterProfile | null): SupporterState {
  if (!profile) return 'none';
  if (profile.supporter) return 'active';
  if (profile.patreon_user_id) return 'linked';
  return 'none';
}

function formatVerifiedDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SupporterScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [profile, setProfile] = useState<SupporterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('supporter, patreon_user_id, patreon_membership_status, supporter_verified_at')
        .eq('id', userId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      setProfile(data as SupporterProfile | null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('supporterLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function connectPatreon() {
    if (connecting) return;
    setConnecting(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('start-patreon-oauth');
      if (invokeError) throw new Error(invokeError.message || t('supporterConnectFailed'));

      const authorizationUrl = (data as { authorizationUrl?: string } | null)?.authorizationUrl;
      if (!authorizationUrl) throw new Error(t('supporterConnectFailed'));

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(authorizationUrl);
      } catch {
        throw new Error(t('supporterConnectFailed'));
      }

      if (parsedUrl.origin !== PATREON_AUTHORIZATION_ORIGIN) {
        throw new Error(t('supporterConnectFailed'));
      }

      await WebBrowser.openAuthSessionAsync(authorizationUrl, REDIRECT_URL);
      await loadProfile();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : t('supporterConnectFailed'));
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t('headerSupporter')} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.helpText}>{t('supporterLoadingStatus')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t('headerSupporter')} />
        <View style={styles.center}>
          <Text style={styles.helpText}>{t('supporterSignInPrompt')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const state = resolveState(profile);
  const verifiedDate = formatVerifiedDate(profile?.supporter_verified_at ?? null);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerSupporter')} />
      <View style={styles.content}>
        <View style={styles.statusCard}>
          {state === 'active' ? (
            <View style={styles.badgeRow}>
              <Star color={colors.supporterGold} fill={colors.supporterGoldFill} size={20} />
              <Text style={styles.statusTitle}>{t('supporterActiveTitle')}</Text>
            </View>
          ) : (
            <Text style={styles.statusTitle}>
              {state === 'linked' ? t('supporterLinkedTitle') : t('supporterNotConnectedTitle')}
            </Text>
          )}

          <Text style={styles.helpText}>
            {state === 'active'
              ? t('supporterActiveBody')
              : state === 'linked'
                ? t('supporterLinkedBody')
                : t('supporterNotConnectedBody')}
          </Text>

          {state === 'active' && verifiedDate ? (
            <Text style={styles.verifiedText}>{t('supporterVerifiedOn', { date: verifiedDate })}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {state !== 'active' ? (
          <Button
            label={state === 'linked' ? t('supporterReconnect') : t('supporterConnect')}
            loading={connecting}
            onPress={() => void connectPatreon()}
            variant="primary"
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  content: { flex: 1, padding: 15, gap: 14 },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 10,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  helpText: { color: colors.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'left' },
  verifiedText: { color: colors.textMuted, fontSize: 12 },
  errorText: {
    padding: 11,
    borderRadius: 11,
    color: colors.dangerText,
    backgroundColor: colors.dangerBackground,
    fontSize: 13,
  },
});
