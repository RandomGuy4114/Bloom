import { Send, Star } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import EmptyState from '@/components/EmptyState';
import Post, { type MobilePost } from '@/components/post';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { createReply, fetchPost, hydratePosts, listReplies, toggleLike, type ReplyRow } from '@/lib/posts';
import { getPublicProfile, resolveAvatarUrl } from '@/lib/profiles';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

type ReplyWithAuthor = ReplyRow & {
  authorAvatarUrl: string | null;
  authorName: string;
  authorSupporter: boolean;
};

export default function PostDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [post, setPost] = useState<MobilePost | null>(null);
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id || !viewerId) return;
    setLoading(true);
    try {
      const row = await fetchPost(id);
      const [hydrated] = await hydratePosts([row], viewerId);
      setPost(hydrated);

      const replyRows = await listReplies(id);
      const withAuthors = await Promise.all(replyRows.map(async (reply): Promise<ReplyWithAuthor> => {
        const profile = await getPublicProfile(reply.user_id);
        return {
          ...reply,
          authorName: profile?.display_name || profile?.username || t('communitiesDefaultUserName'),
          authorAvatarUrl: resolveAvatarUrl(profile?.avatar_url),
          authorSupporter: profile?.supporter === true,
        };
      }));
      setReplies(withAuthors);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, viewerId, t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleToggleLike(target: MobilePost, currentlyLiked: boolean) {
    if (!viewerId) throw new Error(t('homeAuthRequired'));
    return toggleLike(target.id, viewerId, currentlyLiked);
  }

  async function sendReply() {
    if (!viewerId || !id || sending || !replyText.trim()) return;
    setSending(true);
    try {
      const reply = await createReply(id, viewerId, replyText.trim());
      const profile = await getPublicProfile(viewerId);
      setReplies((current) => [...current, {
        ...reply,
        authorName: profile?.display_name || profile?.username || t('postYou'),
        authorAvatarUrl: resolveAvatarUrl(profile?.avatar_url),
        authorSupporter: profile?.supporter === true,
      }]);
      setReplyText('');
      setPost((current) => current ? { ...current, replyCount: (current.replyCount ?? 0) + 1 } : current);
    } catch {
      // reply not sent; keep the draft text so the user can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerPost')} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : notFound || !post ? (
        <View style={styles.center}><EmptyState helpText={t('postNotFoundHelp')} title={t('postNotFoundTitle')} /></View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.flex}>
          <FlatList
            contentContainerStyle={styles.content}
            data={replies}
            keyExtractor={(reply) => reply.id}
            ListEmptyComponent={<Text style={styles.noReplies}>{t('postNoRepliesYet')}</Text>}
            ListHeaderComponent={(
              <View style={styles.postWrapper}>
                <Post onDeleted={() => router.back()} onToggleLike={handleToggleLike} post={post} />
                <Text style={styles.repliesHeading}>{t('postRepliesHeading')}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.replyRow}>
                <View style={styles.replyAvatar}>
                  {item.authorAvatarUrl ? (
                    <Image source={{ uri: item.authorAvatarUrl }} style={styles.replyAvatarImage} />
                  ) : (
                    <Text style={styles.replyAvatarFallback}>{item.authorName.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.replyBubble}>
                  <View style={styles.replyNameRow}>
                    <Text style={styles.replyAuthor}>{item.authorName}</Text>
                    {item.authorSupporter ? <Star color={colors.supporterGold} fill={colors.supporterGoldFill} size={12} /> : null}
                  </View>
                  <Text style={styles.replyBody}>{item.body}</Text>
                </View>
              </View>
            )}
          />
          <View style={styles.composer}>
            <TextInput
              maxLength={2000}
              onChangeText={setReplyText}
              placeholder={t('postWriteReplyPlaceholder')}
              placeholderTextColor={colors.textPlaceholder}
              style={styles.composerInput}
              value={replyText}
            />
            <Pressable
              accessibilityLabel={t('postSendReply')}
              disabled={sending || !replyText.trim()}
              onPress={() => void sendReply()}
              style={[styles.sendButton, (sending || !replyText.trim()) && styles.sendButtonDisabled]}
            >
              {sending ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Send color={colors.textOnPrimary} size={17} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 14, gap: 10, flexGrow: 1 },
  postWrapper: { gap: 10, marginBottom: 4 },
  repliesHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 },
  noReplies: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  replyRow: { flexDirection: 'row', gap: 9 },
  replyAvatar: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  replyAvatarImage: { width: '100%', height: '100%' },
  replyAvatarFallback: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '800' },
  replyBubble: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, padding: 10, gap: 2 },
  replyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  replyAuthor: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  replyBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 19 },
  composer: { padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.background },
  composerInput: { flex: 1, minHeight: 42, paddingHorizontal: 13, borderRadius: 21, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.inputBackground, color: colors.textPrimary, fontSize: 14 },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
});
