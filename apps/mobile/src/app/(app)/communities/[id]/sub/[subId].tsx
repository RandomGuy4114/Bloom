import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import Post, { type MobilePost } from '@/components/post';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import {
  deleteSubCommunity,
  getCommunity,
  getSubCommunity,
  isSubCommunityManager,
  joinSubCommunity,
  type SubCommunityRow,
  updateSubCommunity,
} from '@/lib/communities';
import { hydratePosts, toggleLike, type PostRow } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

export default function SubCommunityDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id, subId } = useLocalSearchParams<{ id: string; subId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [subCommunity, setSubCommunity] = useState<SubCommunityRow | null>(null);
  const [parentName, setParentName] = useState('');
  const [posts, setPosts] = useState<MobilePost[]>([]);
  const [isManager, setIsManager] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !subId || !viewerId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [subData, parentCommunity, manager, postsResult] = await Promise.all([
        getSubCommunity(subId),
        getCommunity(id),
        isSubCommunityManager(subId),
        supabase.from('Posts').select('*').eq('subcommunity', subId).order('created_at', { ascending: false }),
      ]);
      if (postsResult.error) throw postsResult.error;

      setSubCommunity(subData);
      setEditTitle(subData.title);
      setEditDescription(subData.description ?? '');
      setParentName(parentCommunity.name);
      setIsManager(manager);
      setPosts(await hydratePosts((postsResult.data ?? []) as PostRow[], viewerId));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, subId, viewerId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function togglePostLike(post: MobilePost, currentlyLiked: boolean) {
    if (!viewerId) throw new Error(t('homeAuthRequired'));
    return toggleLike(post.id, viewerId, currentlyLiked);
  }

  const isMember = viewerId != null && subCommunity?.members.includes(viewerId) === true;

  async function handleJoin() {
    if (!subId || joinBusy) return;
    setJoinBusy(true);
    try {
      const result = await joinSubCommunity(subId);
      if (result.already_member) {
        Alert.alert(t('subAlreadyMemberTitle'), t('subAlreadyMemberMessage'));
      } else {
        Alert.alert(t('subJoinedTitle'), result.message ?? t('subJoinedMessage'));
      }
      await load();
    } catch (joinError) {
      Alert.alert(t('communitiesSomethingWentWrong'), joinError instanceof Error ? joinError.message : t('createTryAgain'));
    } finally {
      setJoinBusy(false);
    }
  }

  async function saveEdit() {
    if (!subId || savingEdit) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle || trimmedTitle.length > 100) {
      setEditError(t('subTitleLength'));
      return;
    }
    if (editDescription.length > 1000) {
      setEditError(t('createCommunityDescriptionLength'));
      return;
    }
    setEditError('');
    setSavingEdit(true);
    try {
      const trimmedDescription = editDescription.trim();
      await updateSubCommunity(subId, trimmedTitle, trimmedDescription);
      setSubCommunity((current) => (current ? { ...current, title: trimmedTitle, description: trimmedDescription } : current));
      setEditOpen(false);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : t('subUpdateFailed'));
    } finally {
      setSavingEdit(false);
    }
  }

  function confirmDelete() {
    Alert.alert(t('subDeleteTitle'), t('subDeleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => void handleDelete() },
    ]);
  }

  async function handleDelete() {
    if (!subId || !id || deleting) return;
    setDeleting(true);
    try {
      await deleteSubCommunity(subId);
      router.replace(`/communities/${id}`);
    } catch (deleteError) {
      Alert.alert(t('communitiesSomethingWentWrong'), deleteError instanceof Error ? deleteError.message : t('subDeleteFailed'));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t('headerSubCommunity')} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (notFound || !subCommunity) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t('headerSubCommunity')} />
        <View style={styles.center}><EmptyState helpText={t('subNotFoundHelp')} title={t('subNotFoundTitle')} /></View>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.headerContent}>
      <Text style={styles.parentName}>{t('subInParent', { name: parentName })}</Text>
      <Text style={styles.title}>{subCommunity.title}</Text>
      {subCommunity.description ? <Text style={styles.description}>{subCommunity.description}</Text> : null}
      <Text style={styles.memberCount}>{t('communitiesMemberCount', { count: subCommunity.members.length })}</Text>

      {!isMember ? (
        <Button label={t('subJoinButton')} loading={joinBusy} onPress={() => void handleJoin()} />
      ) : null}

      {isManager ? (
        <View style={styles.managerSection}>
          <Text style={styles.sectionHeading}>{t('subManagerToolsHeading')}</Text>
          {editOpen ? (
            <View style={styles.inlineForm}>
              <TextInput maxLength={100} onChangeText={setEditTitle} placeholder={t('subTitleLabel')} placeholderTextColor={colors.textPlaceholder} style={styles.input} value={editTitle} />
              <TextInput
                maxLength={1000}
                multiline
                onChangeText={setEditDescription}
                placeholder={t('createCommunityDescriptionLabel')}
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
                value={editDescription}
              />
              {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
              <View style={styles.inlineFormActions}>
                <Button label={t('cancel')} onPress={() => { setEditOpen(false); setEditTitle(subCommunity.title); setEditDescription(subCommunity.description ?? ''); setEditError(''); }} variant="secondary" />
                <Button label={t('save')} loading={savingEdit} onPress={() => void saveEdit()} />
              </View>
            </View>
          ) : (
            <Button label={t('subEditTitleDescription')} onPress={() => setEditOpen(true)} variant="secondary" />
          )}
          <Button label={t('subDeleteButton')} loading={deleting} onPress={confirmDelete} variant="danger" />
        </View>
      ) : null}

      <Text style={styles.sectionHeading}>{t('communitiesPostsHeading')}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={subCommunity.title} />
      <FlatList
        contentContainerStyle={styles.content}
        data={posts}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={<Text style={styles.mutedInline}>{t('subNoPostsYet')}</Text>}
        ListHeaderComponent={header}
        renderItem={({ item }) => <Post onDeleted={(postId) => setPosts((current) => current.filter((existing) => existing.id !== postId))} onToggleLike={togglePostLike} post={item} />}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  headerContent: { gap: 10, marginBottom: 4 },
  parentName: { color: colors.textFaint, fontSize: 12, fontWeight: '600' },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  memberCount: { color: colors.textFaint, fontSize: 12 },
  sectionHeading: { marginTop: 6, color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  managerSection: { gap: 8, marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
  inlineForm: { gap: 8 },
  inlineFormActions: { flexDirection: 'row', gap: 8 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontSize: 14,
  },
  textArea: { minHeight: 90 },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 9, borderRadius: 9, fontSize: 12 },
  mutedInline: { color: colors.textFaint, fontSize: 13, paddingVertical: 8 },
});
