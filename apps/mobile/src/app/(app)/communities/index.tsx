import { Plus, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';

import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import {
  type CommunityRow,
  isWithinCommunityRadius,
  type JoinStatus,
  type LeaveStatus,
  joinCommunity,
  leaveCommunity,
  listCommunities,
} from '@/lib/communities';
import { getJoinedCommunityIds } from '@/lib/profiles';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, type TranslationKey } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

function scopeLabelKey(community: CommunityRow): TranslationKey {
  if (community.business) return 'communitiesScopeBusiness';
  if (community.global) return 'communitiesScopeGlobal';
  if (community.private) return 'communitiesScopePrivate';
  return 'communitiesScopeLocal';
}

function isHttpsImage(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function joinStatusCopy(status: JoinStatus, t: (key: TranslationKey) => string): { message: string; title: string } {
  switch (status) {
    case 'joined':
      return { title: t('communitiesJoinedTitle'), message: t('communitiesJoinedMessage') };
    case 'already_joined':
      return { title: t('communitiesAlreadyMemberTitle'), message: t('communitiesAlreadyMemberMessage') };
    case 'out_of_range':
      return { title: t('communitiesOutOfRangeTitle'), message: t('communitiesOutOfRangeMessage') };
    case 'private_requested':
      return { title: t('communitiesRequestSentTitle'), message: t('communitiesRequestSentMessage') };
    case 'already_requested':
      return { title: t('communitiesRequestPendingTitle'), message: t('communitiesRequestPendingMessage') };
    default:
      return { title: t('done'), message: '' };
  }
}

function leaveStatusCopy(status: LeaveStatus, t: (key: TranslationKey) => string): { message: string; title: string } {
  switch (status) {
    case 'left':
      return { title: t('communitiesLeftTitle'), message: t('communitiesLeftMessage') };
    case 'not_joined':
      return { title: t('communitiesNotMemberTitle'), message: t('communitiesNotMemberMessage') };
    case 'owner_cannot_leave':
      return { title: t('communitiesCantLeaveTitle'), message: t('communitiesCantLeaveMessage') };
    default:
      return { title: t('done'), message: '' };
  }
}

export default function CommunitiesScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(null);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setUserLocation(null);
    }
  }, []);

  const load = useCallback(async (showRefresh = false) => {
    if (!viewerId) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    setError('');
    try {
      const [allCommunities, joined] = await Promise.all([
        listCommunities(),
        getJoinedCommunityIds(viewerId),
      ]);
      setCommunities(allCommunities);
      setJoinedIds(joined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('communitiesLoadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewerId]);

  useFocusEffect(useCallback(() => {
    void loadLocation();
    void load();
  }, [loadLocation, load]));

  const nearby = useMemo(
    () => communities.filter((community) => isWithinCommunityRadius(community, userLocation)),
    [communities, userLocation],
  );
  const mine = useMemo(
    () => communities.filter((community) => joinedIds.includes(community.id)),
    [communities, joinedIds],
  );

  function isMemberOf(community: CommunityRow) {
    if (joinedIds.includes(community.id)) return true;
    return viewerId != null && community.members?.includes(viewerId) === true;
  }

  async function handleJoin(community: CommunityRow) {
    if (!viewerId || busyId) return;
    setBusyId(community.id);
    try {
      const status = await joinCommunity(community.id, userLocation);
      const copy = joinStatusCopy(status, t);
      Alert.alert(copy.title, copy.message);
      if (status === 'joined') {
        setJoinedIds((current) => [...current, community.id]);
        setCommunities((current) => current.map((existing) => (
          existing.id === community.id
            ? { ...existing, members: [...(existing.members ?? []), viewerId] }
            : existing
        )));
      }
    } catch (joinError) {
      Alert.alert(t('communitiesSomethingWentWrong'), joinError instanceof Error ? joinError.message : t('createTryAgain'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave(community: CommunityRow) {
    if (!viewerId || busyId) return;
    setBusyId(community.id);
    try {
      const status = await leaveCommunity(community.id);
      const copy = leaveStatusCopy(status, t);
      Alert.alert(copy.title, copy.message);
      if (status === 'left') {
        setJoinedIds((current) => current.filter((id) => id !== community.id));
        setCommunities((current) => current.map((existing) => (
          existing.id === community.id
            ? { ...existing, members: (existing.members ?? []).filter((memberId) => memberId !== viewerId) }
            : existing
        )));
      }
    } catch (leaveError) {
      Alert.alert(t('communitiesSomethingWentWrong'), leaveError instanceof Error ? leaveError.message : t('createTryAgain'));
    } finally {
      setBusyId(null);
    }
  }

  function renderCommunity(community: CommunityRow) {
    const isMember = isMemberOf(community);
    const imageUrl = community.picture_url ?? community.banner_url;
    const memberCount = community.members?.length ?? 0;
    const busy = busyId === community.id;

    return (
      <View key={community.id} style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/communities/${community.id}`)}
          style={styles.cardInfo}
        >
          <View style={styles.thumb}>
            {isHttpsImage(imageUrl) ? (
              <Image source={{ uri: imageUrl }} style={styles.thumbImage} />
            ) : (
              <Text style={styles.thumbFallback}>{community.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.cardName}>{community.name}</Text>
            <Text style={styles.cardMeta}>
              {t(scopeLabelKey(community))} · {t('communitiesMemberCount', { count: memberCount })}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel={isMember ? t('communitiesLeaveCommunityLabel') : t('communitiesJoinCommunityLabel')}
          disabled={busy}
          onPress={() => void (isMember ? handleLeave(community) : handleJoin(community))}
          style={[styles.actionButton, isMember && styles.actionButtonLeave, busy && styles.actionButtonBusy]}
        >
          {busy ? (
            <ActivityIndicator color={isMember ? colors.dangerText : colors.textOnPrimary} size="small" />
          ) : (
            <Text style={[styles.actionButtonText, isMember && styles.actionButtonTextLeave]}>
              {isMember ? t('communitiesLeave') : t('communitiesJoin')}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabCommunities')}</Text>
        <Pressable
          accessibilityLabel={t('headerCreateCommunity')}
          hitSlop={10}
          onPress={() => router.push('/communities/create')}
          style={styles.iconButton}
        >
          <Plus color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>{t('communitiesLoading')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => void load(true)} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>{t('communitiesNearbySection')}</Text>
          {nearby.length ? (
            <View style={styles.sectionList}>{nearby.map(renderCommunity)}</View>
          ) : (
            <EmptyState
              helpText={userLocation ? t('communitiesNoneNearbyHelp') : t('communitiesEnableLocationHelp')}
              Icon={Users}
              title={t('communitiesNothingNearbyTitle')}
            />
          )}

          <Text style={styles.sectionTitle}>{t('communitiesMineSection')}</Text>
          {mine.length ? (
            <View style={styles.sectionList}>{mine.map(renderCommunity)}</View>
          ) : (
            <EmptyState helpText={t('communitiesNoneJoinedHelp')} Icon={Users} title={t('communitiesNoneJoinedTitle')} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, minHeight: 260, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
  content: { padding: 14, gap: 10, flexGrow: 1 },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
  sectionTitle: { marginTop: 8, color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  sectionList: { gap: 10 },
  card: {
    minHeight: 76,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbFallback: { color: colors.textOnPrimary, fontSize: 19, fontWeight: '800' },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  cardMeta: { color: colors.textFaint, fontSize: 12 },
  actionButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLeave: { backgroundColor: colors.dangerBackground },
  actionButtonBusy: { opacity: 0.7 },
  actionButtonText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  actionButtonTextLeave: { color: colors.dangerText },
});
