import { Zap } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Post, { type MobilePost } from '@/components/post';
import { useAuth } from '@/context/AuthContext';
import { getConnectSummary } from '@/lib/connect';
import { hydratePosts, toggleLike, type PostRow } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';
import { useFocusEffect, useRouter } from 'expo-router';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const [posts, setPosts] = useState<MobilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [connectEnabled, setConnectEnabled] = useState(false);
  const [hasConnections, setHasConnections] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError('');
    const { data: feedData, error: feedError } = await supabase.rpc('get_home_feed', {
      feed_limit: 50,
      user_latitude: null,
      user_longitude: null,
    });

    if (feedError) {
      setError(feedError.message);
      setPosts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setPosts(await hydratePosts((feedData ?? []) as PostRow[], session.user.id));
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useFocusEffect(useCallback(() => {
    void loadPosts();
  }, [loadPosts]));

  useFocusEffect(useCallback(() => {
    let active = true;
    getConnectSummary().then((summary) => {
      if (!active) return;
      setConnectEnabled(summary.enabled);
      setHasConnections(summary.encounters.length > 0);
    }).catch((connectError) => {
      console.error('Error checking Connect status:', connectError);
    });
    return () => { active = false; };
  }, []));

  async function togglePostLike(post: MobilePost, currentlyLiked: boolean) {
    if (!session?.user.id) throw new Error(t('homeAuthRequired'));
    return toggleLike(post.id, session.user.id, currentlyLiked);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={{ padding: 14, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider, justifyContent: "space-between", flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.title}>Bloom</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={t('headerActivity')} hitSlop={10} onPress={() => router.push('/activity')} style={styles.activityButton}>
            <Zap color={colors.textSecondary} size={21} />
          </Pressable>
          <Pressable style={styles.connectHolder} onPress={() => router.push('/connect')}>
              <Text style={{ color: colors.primary, fontWeight: '700', marginRight: 8, textAlign: "left" }}>{t('homeConnect')}</Text>
              <View style={[styles.connectIndicator, { backgroundColor: !connectEnabled ? colors.danger : hasConnections ? colors.success : colors.warning }]} />
          </Pressable>
        </View>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>{t('homeLoadingFeed')}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.feed}
          data={posts}
          keyExtractor={(post) => post.id}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>{t('homeNoPostsTitle')}</Text><Text style={styles.muted}>{error || t('homeEmptyFeedHelp')}</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => { setRefreshing(true); void loadPosts(); }} />}
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  feed: { padding: 14, gap: 12, flexGrow: 1 },
  center: { flex: 1, minHeight: 260, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  muted: { color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  connectHolder: { height: 40, backgroundColor: colors.primaryTint, paddingHorizontal: 14, borderRadius: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  connectIndicator: { width: 20, height: 20, borderRadius: 10 },
});
