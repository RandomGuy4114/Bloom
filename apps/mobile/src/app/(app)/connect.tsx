import { ArrowLeft, MapPin, RefreshCw, Star, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  type ConnectEncounter,
  getConnectSummary,
  resolveProfilePicture,
  setConnectEnabled,
} from '@/lib/connect';
import { useLanguage, type TranslationKey } from '@/context/LanguageContext';

function displayName(user: ConnectEncounter, t: (key: TranslationKey) => string) {
  return user.display_name?.trim() || user.username?.trim() || t('communitiesDefaultUserName');
}

function ConnectedUser({ user }: { user: ConnectEncounter }) {
  const { t, language } = useLanguage();
  const name = displayName(user, t);
  const avatarUrl = resolveProfilePicture(user.avatar_url);

  return (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarFallback}>{name.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.userDetails}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.userName}>{name}</Text>
          {user.supporter ? <Star color="#B28B22" fill="#E4BD4C" size={15} /> : null}
        </View>
        {user.username ? <Text style={styles.username}>@{user.username}</Text> : null}
        <Text style={styles.connectedAt}>{t('connectConnectedOn')} {new Date(user.connected_at).toLocaleDateString(language)}</Text>
      </View>
    </View>
  );
}

export default function ConnectScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [encounters, setEncounters] = useState<ConnectEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const loadConnect = useCallback(async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    try {
      const summary = await getConnectSummary();
      setEnabled(summary.enabled);
      setEncounters(summary.encounters);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('connectLoadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadConnect();
    const refreshTimer = setInterval(() => void loadConnect(), 20_000);
    return () => clearInterval(refreshTimer);
  }, [loadConnect]);

  async function toggleConnect(nextEnabled: boolean) {
    if (updating) return;
    setUpdating(true);
    try {
      const savedState = await setConnectEnabled(nextEnabled);
      setEnabled(savedState);
      setError('');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('settingsConnectUpdateFailed'));
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color="#7F9B6D" size="large" />
          <Text style={styles.helpText}>{t('connectLoading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = !enabled ? '#C94F4F' : encounters.length ? '#7F9B6D' : '#D5A928';
  const statusText = !enabled
    ? t('settingsConnectOff')
    : encounters.length
      ? t('connectActive')
      : t('connectActiveLooking');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t('connectGoBack')} hitSlop={10} onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft color="#26342B" size={24} />
        </Pressable>
        <Text style={styles.title}>{t('homeConnect')}</Text>
        <Pressable accessibilityLabel={t('connectRefresh')} hitSlop={10} onPress={() => void loadConnect(true)} style={styles.iconButton}>
          <RefreshCw color="#657368" size={21} />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={encounters}
        keyExtractor={(user) => user.user_id}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor="#7F9B6D" onRefresh={() => void loadConnect(true)} />}
        renderItem={({ item }) => <ConnectedUser user={item} />}
        ListHeaderComponent={(
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusHeading}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>{statusText}</Text>
                  <Text style={styles.helpText}>
                    {enabled
                      ? t('connectEnabledHelp')
                      : t('connectDisabledHelp')}
                  </Text>
                </View>
                {updating ? (
                  <ActivityIndicator color="#7F9B6D" />
                ) : (
                  <Switch
                    accessibilityLabel={t('connectEnableLabel')}
                    onValueChange={(value) => void toggleConnect(value)}
                    trackColor={{ false: '#CED4CE', true: '#B7C7AD' }}
                    thumbColor={enabled ? '#70885F' : '#F5F5F5'}
                    value={enabled}
                  />
                )}
              </View>
              <View style={styles.privacyNote}>
                <MapPin color="#657368" size={17} />
                <Text style={styles.privacyText}>{t('connectPrivacyNote')}</Text>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.sectionHeading}>
              <Users color="#536358" size={20} />
              <Text style={styles.sectionTitle}>{t('connectPeopleHeading')}</Text>
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Users color="#97A29A" size={34} />
            <Text style={styles.emptyTitle}>{t('connectEmptyTitle')}</Text>
            <Text style={styles.helpText}>{t('connectEmptyHelp')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F6F2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8DFD9' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#26342B', fontSize: 21, fontWeight: '800' },
  content: { flexGrow: 1, padding: 15, gap: 10 },
  statusCard: { padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE4DD', gap: 14 },
  statusHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusIndicator: { width: 14, height: 14, borderRadius: 7 },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { color: '#26342B', fontSize: 16, fontWeight: '700' },
  helpText: { color: '#737C76', fontSize: 13, lineHeight: 19, textAlign: 'left' },
  privacyNote: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D8DFD9', flexDirection: 'row', alignItems: 'center', gap: 7 },
  privacyText: { flex: 1, color: '#657368', fontSize: 12, lineHeight: 17 },
  errorText: { padding: 11, borderRadius: 11, color: '#923F3F', backgroundColor: '#FBEAEA', fontSize: 13 },
  sectionHeading: { marginTop: 12, marginBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#35443A', fontSize: 17, fontWeight: '700' },
  userCard: { minHeight: 76, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E5E0', flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: '#9CB080', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  userDetails: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userName: { maxWidth: '88%', color: '#26342B', fontSize: 15, fontWeight: '700' },
  username: { color: '#657368', fontSize: 13 },
  connectedAt: { marginTop: 2, color: '#929A94', fontSize: 11 },
  emptyCard: { minHeight: 210, padding: 28, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E5E0', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { color: '#35443A', fontSize: 17, fontWeight: '700' },
});
