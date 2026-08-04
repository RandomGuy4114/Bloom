import { Search, Zap } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import EmptyState from '@/components/EmptyState';
import ScreenHeader from '@/components/ScreenHeader';
import Post, { type MobilePost, type PostKind } from '@/components/post';
import { useAuth } from '@/context/AuthContext';
import { isWithinCommunityRadius, type CommunityRow } from '@/lib/communities';
import { hydratePosts, toggleLike, type PostRow } from '@/lib/posts';
import { getJoinedCommunityIds } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';
import * as Location from 'expo-location';

type TypeFilter = 'all' | 'activity' | 'event';
type ScopeFilter = 'all' | 'my' | 'nearby';

const TYPE_FILTERS: { labelKey: 'activityFilterAll' | 'activityFilterActivity' | 'activityFilterEvent'; value: TypeFilter }[] = [
  { labelKey: 'activityFilterAll', value: 'all' },
  { labelKey: 'activityFilterActivity', value: 'activity' },
  { labelKey: 'activityFilterEvent', value: 'event' },
];

const SCOPE_FILTERS: { labelKey: 'activityScopeAll' | 'activityScopeMy' | 'activityScopeNearby'; value: ScopeFilter }[] = [
  { labelKey: 'activityScopeAll', value: 'all' },
  { labelKey: 'activityScopeMy', value: 'my' },
  { labelKey: 'activityScopeNearby', value: 'nearby' },
];

export default function ActivityScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [posts, setPosts] = useState<MobilePost[]>([]);
  const [communitiesById, setCommunitiesById] = useState<Map<string, CommunityRow>>(new Map());
  const [postCommunityIds, setPostCommunityIds] = useState<Map<string, string>>(new Map());
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [search, setSearch] = useState('');

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

  const loadPosts = useCallback(async () => {
    if (!viewerId) {
      setLoading(false);
      return;
    }

    setError('');
    try {
      const joinedCommunityIds = await getJoinedCommunityIds(viewerId);
      if (!joinedCommunityIds.length) {
        setPosts([]);
        setCommunitiesById(new Map());
        setPostCommunityIds(new Map());
        setLoading(false);
        return;
      }

      const { data, error: postsError } = await supabase
        .from('Posts')
        .select('*')
        .in('community', joinedCommunityIds)
        .in('post_type', ['activity', 'event'])
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const rows = (data ?? []) as PostRow[];
      const communityIds = [...new Set(rows.map((row) => row.community).filter((id): id is string => Boolean(id)))];

      const [hydrated, communitiesResult] = await Promise.all([
        hydratePosts(rows, viewerId),
        communityIds.length
          ? supabase.from('Communities').select('id, name, description, user_id, banner_url, picture_url, members, global, latitude, longitude, radius_meters, location_label, business, private').in('id', communityIds)
          : Promise.resolve({ data: [] as CommunityRow[], error: null }),
      ]);

      if (communitiesResult.error) throw communitiesResult.error;

      const nextCommunitiesById = new Map<string, CommunityRow>(
        ((communitiesResult.data ?? []) as CommunityRow[]).map((community) => [String(community.id), community]),
      );
      const nextPostCommunityIds = new Map<string, string>(
        rows.map((row) => [String(row.id), row.community ? String(row.community) : '']),
      );

      setPosts(hydrated);
      setCommunitiesById(nextCommunitiesById);
      setPostCommunityIds(nextPostCommunityIds);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('activityLoadFailed'));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [viewerId]);

  useFocusEffect(useCallback(() => {
    void loadLocation();
    void loadPosts();
  }, [loadLocation, loadPosts]));

  async function togglePostLike(post: MobilePost, currentlyLiked: boolean) {
    if (!viewerId) throw new Error('Authentication required.');
    return toggleLike(post.id, viewerId, currentlyLiked);
  }

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (typeFilter !== 'all' && post.type !== (typeFilter as PostKind)) return false;

      if (scopeFilter === 'my') {
        if (!viewerId || post.author.id !== viewerId) return false;
      } else if (scopeFilter === 'nearby') {
        const communityId = postCommunityIds.get(post.id);
        const community = communityId ? communitiesById.get(communityId) : undefined;
        if (!community || !isWithinCommunityRadius(community, userLocation)) return false;
      }

      if (query) {
        const haystack = [post.title, post.body, post.location, post.author.name, post.communityName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [posts, typeFilter, scopeFilter, search, viewerId, postCommunityIds, communitiesById, userLocation]);

  function emptyStateCopy() {
    if (search.trim()) return t('activityEmptySearch');
    if (scopeFilter === 'my') return t('activityEmptyMy');
    if (scopeFilter === 'nearby') return userLocation ? t('activityEmptyNearby') : t('activityEmptyLocationRequired');
    return t('activityEmptyDefault');
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerActivity')} />

      <View style={styles.filters}>
        <View style={styles.searchRow}>
          <Search color={colors.textFaint} size={17} />
          <TextInput
            onChangeText={setSearch}
            placeholder={t('activitySearchPlaceholder')}
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={search}
          />
        </View>

        <View style={styles.chipRow}>
          {TYPE_FILTERS.map((filter) => {
            const selected = typeFilter === filter.value;
            return (
              <Text
                key={filter.value}
                onPress={() => setTypeFilter(filter.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {t(filter.labelKey)}
              </Text>
            );
          })}
        </View>

        <View style={styles.chipRow}>
          {SCOPE_FILTERS.map((filter) => {
            const selected = scopeFilter === filter.value;
            return (
              <Text
                key={filter.value}
                onPress={() => setScopeFilter(filter.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {t(filter.labelKey)}
              </Text>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>{t('activityLoading')}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.feed}
          data={visiblePosts}
          keyExtractor={(post) => post.id}
          ListEmptyComponent={<EmptyState Icon={Zap} helpText={error || emptyStateCopy()} title={t('activityEmptyTitle')} />}
          renderItem={({ item }) => (
            <Post
              onDeleted={(postId) => setPosts((current) => current.filter((existing) => existing.id !== postId))}
              onToggleLike={togglePostLike}
              post={item}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  filters: { padding: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  searchRow: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    overflow: 'hidden',
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.chipInactive,
    color: colors.chipInactiveText,
    fontSize: 12,
    fontWeight: '700',
  },
  chipSelected: { backgroundColor: colors.primary, color: colors.textOnPrimary },
  feed: { padding: 14, gap: 12, flexGrow: 1 },
  center: { flex: 1, minHeight: 260, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
});
