import { CalendarDays, FileText, Heart, MapPin, MessageCircle, MoreVertical, Star, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, type TranslationKey } from '@/context/LanguageContext';
import { deletePost, reportPost } from '@/lib/posts';
import type { ThemePalette } from '@/theme/colors';

export type PostKind = 'activity' | 'event' | 'post';

export type MobilePost = {
  author: {
    avatarUrl?: string | null;
    id: string;
    name: string;
    supporter?: boolean;
  };
  body?: string | null;
  communityName?: string | null;
  createdAt?: string | null;
  id: string;
  imageUrls?: string[];
  likedByViewer?: boolean;
  likeCount?: number;
  location?: string | null;
  replyCount?: number;
  title?: string | null;
  type: PostKind;
};

type PostProps = {
  onDeleted?: (postId: string) => void;
  onToggleLike?: (
    post: MobilePost,
    currentlyLiked: boolean,
  ) => Promise<{ count: number; liked: boolean }>;
  post: MobilePost;
};

function makeTypeStyles(colors: ThemePalette) {
  return {
    post: { background: colors.primarySoft, color: '#78906A', labelKey: 'post' as TranslationKey, Icon: FileText },
    activity: { background: '#E0EFFF', color: '#245F91', labelKey: 'activityFilterActivity' as TranslationKey, Icon: Zap },
    event: { background: '#F7E7FF', color: '#76428E', labelKey: 'activityFilterEvent' as TranslationKey, Icon: CalendarDays },
  } as const;
}

function validImageUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export default function Post({ onDeleted, onToggleLike, post }: PostProps) {
  const router = useRouter();
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const typeStyles = useMemo(() => makeTypeStyles(colors), [colors]);
  const viewerId = session?.user.id;
  const isOwner = viewerId != null && viewerId === post.author.id;

  const [liked, setLiked] = useState(post.likedByViewer === true);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [busy, setBusy] = useState(false);
  const kind = typeStyles[post.type] ?? typeStyles.post;
  const KindIcon = kind.Icon;
  const images = [...new Set(post.imageUrls ?? [])].filter(validImageUrl).slice(0, 5);

  async function toggleLike() {
    if (!onToggleLike || busy) return;
    setBusy(true);
    try {
      const result = await onToggleLike(post, liked);
      setLiked(result.liked);
      setLikeCount(result.count);
    } finally {
      setBusy(false);
    }
  }

  function openPost() {
    router.push(`/post/${post.id}`);
  }

  function openAuthor() {
    router.push(`/profile/${post.author.id}`);
  }

  async function handleReport() {
    if (!viewerId) return;
    try {
      const result = await reportPost(post.id, viewerId);
      Alert.alert(
        result === 'already-reported' ? t('postAlreadyReportedTitle') : t('postReportedTitle'),
        result === 'already-reported' ? t('postAlreadyReportedMessage') : t('postReportedMessage'),
      );
    } catch (reportError) {
      Alert.alert(t('communitiesSomethingWentWrong'), reportError instanceof Error ? reportError.message : t('createTryAgain'));
    }
  }

  function handleDelete() {
    Alert.alert(t('postDeleteTitle'), t('postDeleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void deletePost(post.id)
            .then(() => onDeleted?.(post.id))
            .catch((deleteError: unknown) => {
              Alert.alert(t('postCouldNotDeleteTitle'), deleteError instanceof Error ? deleteError.message : t('createTryAgain'));
            });
        },
      },
    ]);
  }

  function openMenu() {
    if (isOwner) {
      Alert.alert(t('postManageTitle'), undefined, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('edit'), onPress: () => router.push(`/post/${post.id}/edit`) },
        { text: t('delete'), style: 'destructive', onPress: handleDelete },
      ]);
    } else if (viewerId) {
      Alert.alert(t('postOptionsTitle'), undefined, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('postReportPost'), style: 'destructive', onPress: () => void handleReport() },
      ]);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[styles.typeBadge, { backgroundColor: kind.background }]}>
          <KindIcon color={kind.color} size={14} strokeWidth={2.4} />
          <Text style={[styles.typeLabel, { color: kind.color }]}>{t(kind.labelKey)}</Text>
        </View>
        <Pressable accessibilityLabel={t('postOptionsTitle')} hitSlop={10} onPress={openMenu} style={styles.optionsButton}>
          <MoreVertical color="#4B514C" size={23} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={openAuthor} style={styles.authorHeader}>
        <View style={styles.avatar}>
          {post.author.avatarUrl && validImageUrl(post.author.avatarUrl) ? (
            <Image source={{ uri: post.author.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarFallback}>{post.author.name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.authorText}>
          <View style={styles.authorNameRow}>
            <Text numberOfLines={1} style={styles.authorName}>{post.author.name}</Text>
            {post.author.supporter ? <Star color={colors.supporterGold} fill={colors.supporterGoldFill} size={15} /> : null}
          </View>
          {post.communityName ? <Text numberOfLines={1} style={styles.communityName}>{t('mapInCommunity', { name: post.communityName })}</Text> : null}
        </View>
      </Pressable>

      <Pressable onPress={openPost}>
        {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
        {post.body ? <Text numberOfLines={6} style={styles.body}>{post.body}</Text> : null}

        {post.type === 'event' && post.location ? (
          <View style={styles.location}>
            <MapPin color="#66736B" size={16} />
            <Text style={styles.locationText}><Text style={styles.locationLabel}>{t('postLocationLabel')} </Text>{post.location}</Text>
          </View>
        ) : null}

        {images.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageGallery}>
            {images.map((url) => <Image key={url} source={{ uri: url }} resizeMode="cover" style={[styles.postImage, images.length === 1 && styles.singleImage]} />)}
          </ScrollView>
        ) : null}

        {post.createdAt ? <Text style={styles.time}>{t('postPostedOn', { date: new Date(post.createdAt).toLocaleString() })}</Text> : null}
      </Pressable>

      <View style={styles.engagement}>
        <Pressable
          accessibilityLabel={liked ? t('postUnlike') : t('postLike')}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, selected: liked }}
          disabled={busy || !onToggleLike}
          onPress={toggleLike}
          style={({ pressed }) => [styles.engagementButton, pressed && styles.pressed]}
        >
          <Heart color={liked ? colors.like : '#66736B'} fill={liked ? colors.like : 'none'} size={19} />
          <Text style={[styles.engagementText, liked && styles.likedText]}>{t('postLikeCount', { count: likeCount })}</Text>
        </Pressable>
        <Pressable onPress={openPost} style={({ pressed }) => [styles.engagementButton, pressed && styles.pressed]}>
          <MessageCircle color="#66736B" size={19} />
          <Text style={styles.engagementText}>{t('postReplyCount', { count: post.replyCount ?? 0 })}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  card: { width: '100%', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', gap: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: { minHeight: 26, paddingHorizontal: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5 },
  typeLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  optionsButton: { width: 32, height: 30, alignItems: 'center', justifyContent: 'center' },
  authorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, overflow: 'hidden', borderRadius: 17, backgroundColor: '#9CB080', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  authorText: { flex: 1, minWidth: 0 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorName: { maxWidth: '88%', color: '#26342B', fontSize: 14, fontWeight: '700' },
  communityName: { marginTop: 1, color: '#888888', fontSize: 12 },
  title: { color: '#243129', fontSize: 19, lineHeight: 24, fontWeight: '700' },
  body: { color: '#333333', fontSize: 15, lineHeight: 21 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F1F4F0' },
  locationText: { flex: 1, color: '#66736B', fontSize: 13, lineHeight: 18 },
  locationLabel: { fontWeight: '700' },
  imageGallery: { gap: 8 },
  postImage: { width: 245, height: 190, borderRadius: 12, backgroundColor: '#E8ECE8' },
  singleImage: { width: 310 },
  time: { color: '#777777', fontSize: 11, marginTop: 1 },
  engagement: { minHeight: 42, marginTop: 2, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D8DFD9', flexDirection: 'row', alignItems: 'center', gap: 8 },
  engagementButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  engagementText: { color: '#66736B', fontSize: 12, fontWeight: '600' },
  likedText: { color: colors.like },
  pressed: { backgroundColor: '#EDF0ED', opacity: 0.8 },
});
