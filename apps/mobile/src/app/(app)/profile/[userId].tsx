import { MoreVertical, Pencil, ShieldOff, Star, UserX } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import EmptyState from '@/components/EmptyState';
import Post, { type MobilePost } from '@/components/post';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hydratePosts, toggleLike, type PostRow } from '@/lib/posts';
import {
  type BlockStatus,
  blockUser,
  getBlockStatus,
  getJoinedCommunityIds,
  getPublicProfile,
  type PublicProfile,
  resolveAvatarUrl,
  unblockUser,
} from '@/lib/profiles';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuth();
  const viewerId = session?.user.id;
  const isOwnProfile = viewerId === userId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<MobilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !viewerId) return;
    setLoading(true);
    try {
      const [profileData, joinedCommunityIds] = await Promise.all([
        getPublicProfile(userId),
        getJoinedCommunityIds(viewerId),
      ]);
      setProfile(profileData);

      if (!isOwnProfile) {
        getBlockStatus(userId).then(setBlockStatus).catch(() => {});
      }

      if (joinedCommunityIds.length) {
        const { data, error } = await supabase
          .rpc('get_visible_posts', { target_user: userId, community_ids: joinedCommunityIds });
        if (!error && data) {
          const sortedPosts = (data as PostRow[]).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          setPosts(await hydratePosts(sortedPosts, viewerId));
        } else {
          setPosts([]);
        }
      } else {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, userId, viewerId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleToggleLike(post: MobilePost, currentlyLiked: boolean) {
    if (!viewerId) throw new Error(t('homeAuthRequired'));
    return toggleLike(post.id, viewerId, currentlyLiked);
  }

  function confirmBlockToggle() {
    if (!userId || blockBusy) return;
    const currentlyBlocked = blockStatus?.blocked === true;
    Alert.alert(
      currentlyBlocked ? t('profileUnblockConfirmTitle') : t('profileBlockConfirmTitle'),
      currentlyBlocked
        ? t('profileUnblockConfirmMessage')
        : t('profileBlockConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: currentlyBlocked ? t('profileUnblock') : t('profileBlock'),
          style: 'destructive',
          onPress: () => void performBlockToggle(currentlyBlocked),
        },
      ],
    );
  }

  async function performBlockToggle(currentlyBlocked: boolean) {
    if (!userId) return;
    setBlockBusy(true);
    try {
      const result = currentlyBlocked ? await unblockUser(userId) : await blockUser(userId);
      setBlockStatus(result);
      if (!currentlyBlocked) setPosts([]);
    } catch (error) {
      Alert.alert(t('communitiesSomethingWentWrong'), error instanceof Error ? error.message : t('createTryAgain'));
    } finally {
      setBlockBusy(false);
    }
  }

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url);
  const displayName = profile?.display_name || profile?.username || t('communitiesDefaultUserName');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        right={isOwnProfile ? (
          <Pressable accessibilityLabel={t('settingsEditProfile')} hitSlop={10} onPress={() => router.push('/profile/edit')} style={styles.headerAction}>
            <Pencil color={colors.textSecondary} size={20} />
          </Pressable>
        ) : (
          <Pressable accessibilityLabel={t('profileMoreOptions')} hitSlop={10} onPress={confirmBlockToggle} style={styles.headerAction}>
            {blockBusy ? <ActivityIndicator color={colors.textSecondary} size="small" /> : <MoreVertical color={colors.textSecondary} size={20} />}
          </Pressable>
        )}
        title={t('profileTitle')}
      />

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.center}>
          <EmptyState title={t('profileNotFoundTitle')} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.feed}
          data={blockStatus?.blocked ? [] : posts}
          keyExtractor={(post) => post.id}
          ListEmptyComponent={(
            <EmptyState
              helpText={blockStatus?.blocked ? t('profileBlockedHelp') : t('profileNoPostsHelp')}
              title={blockStatus?.blocked ? t('profileUserBlockedTitle') : t('profileNoPostsTitle')}
            />
          )}
          ListHeaderComponent={(
            <View style={styles.header}>
              <View style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarFallback}>{displayName.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                {profile.supporter ? <Star color={colors.supporterGold} fill={colors.supporterGoldFill} size={17} /> : null}
              </View>
              {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              {!isOwnProfile && blockStatus ? (
                <Pressable disabled={blockBusy} onPress={confirmBlockToggle} style={[styles.blockButton, blockStatus.blocked && styles.unblockButton]}>
                  {blockStatus.blocked ? <ShieldOff color={colors.textSecondary} size={16} /> : <UserX color={colors.dangerText} size={16} />}
                  <Text style={[styles.blockButtonText, blockStatus.blocked && styles.unblockButtonText]}>
                    {blockStatus.blocked ? t('profileUnblock') : t('profileBlock')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
          renderItem={({ item }) => <Post onToggleLike={handleToggleLike} post={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  feed: { padding: 14, gap: 12, flexGrow: 1 },
  header: { alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, gap: 6, marginBottom: 4 },
  avatar: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { color: colors.textOnPrimary, fontSize: 28, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  username: { color: colors.textMuted, fontSize: 13 },
  bio: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  blockButton: { marginTop: 10, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.dangerBackground, flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockButtonText: { color: colors.dangerText, fontSize: 13, fontWeight: '700' },
  unblockButton: { backgroundColor: colors.chipInactive },
  unblockButtonText: { color: colors.textSecondary },
});
