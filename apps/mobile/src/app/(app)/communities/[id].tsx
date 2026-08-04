import { Settings, Trash2, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import Post, { type MobilePost } from '@/components/post';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import {
  type CommunityRow,
  deleteCommunity,
  getCommunity,
  getPendingJoinRequests,
  isWithinCommunityRadius,
  type JoinRequestResponse,
  type JoinStatus,
  joinCommunity,
  type LeaveStatus,
  leaveCommunity,
  listSubCommunities,
  respondToJoinRequest,
  setCommunityPicture,
  setCommunityPrivacy,
  type SubCommunitySummary,
  updateCommunityInfo,
  uploadCommunityBanner,
} from '@/lib/communities';
import { hydratePosts, toggleLike, type PostRow } from '@/lib/posts';
import { getJoinedCommunityIds, getPublicProfile, type PublicProfile, resolveAvatarUrl } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useLanguage, type TranslationKey } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

type MemberEntry = { id: string; profile: PublicProfile | null };

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

export default function CommunityDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [posts, setPosts] = useState<MobilePost[]>([]);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [subCommunities, setSubCommunities] = useState<SubCommunitySummary[]>([]);
  const [canCreateSub, setCanCreateSub] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<MemberEntry[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [privacyUpdating, setPrivacyUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const load = useCallback(async () => {
    if (!id || !viewerId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const communityData = await getCommunity(id);
      setCommunity(communityData);
      setEditName(communityData.name);
      setEditDescription(communityData.description ?? '');

      const [postsResult, joined, subsResult] = await Promise.all([
        supabase.from('Posts').select('*').eq('community', id).is('subcommunity', null).order('created_at', { ascending: false }),
        getJoinedCommunityIds(viewerId),
        listSubCommunities(id),
      ]);
      if (postsResult.error) throw postsResult.error;

      setPosts(await hydratePosts((postsResult.data ?? []) as PostRow[], viewerId));
      setJoinedIds(joined);
      setSubCommunities(subsResult.subCommunities);
      setCanCreateSub(subsResult.canCreate);

      const memberIds = communityData.members ?? [];
      const memberEntries = await Promise.all(memberIds.map(async (memberId): Promise<MemberEntry> => ({
        id: memberId,
        profile: await getPublicProfile(memberId),
      })));
      setMembers(memberEntries);

      if (communityData.user_id === viewerId) {
        const pendingUserIds = await getPendingJoinRequests(id);
        const pendingEntries = await Promise.all(pendingUserIds.map(async (requesterId): Promise<MemberEntry> => ({
          id: requesterId,
          profile: await getPublicProfile(requesterId),
        })));
        setPendingRequests(pendingEntries);
      } else {
        setPendingRequests([]);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, viewerId]);

  useFocusEffect(useCallback(() => {
    void loadLocation();
    void load();
  }, [loadLocation, load]));

  async function togglePostLike(post: MobilePost, currentlyLiked: boolean) {
    if (!viewerId) throw new Error(t('homeAuthRequired'));
    return toggleLike(post.id, viewerId, currentlyLiked);
  }

  function isMember() {
    if (!community) return false;
    if (joinedIds.includes(community.id)) return true;
    return viewerId != null && community.members?.includes(viewerId) === true;
  }

  async function handleJoin() {
    if (!viewerId || !community || joinBusy) return;
    setJoinBusy(true);
    try {
      const status = await joinCommunity(community.id, userLocation);
      const copy = joinStatusCopy(status, t);
      Alert.alert(copy.title, copy.message);
      if (status === 'joined') await load();
    } catch (joinError) {
      Alert.alert(t('communitiesSomethingWentWrong'), joinError instanceof Error ? joinError.message : t('createTryAgain'));
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleLeave() {
    if (!community || joinBusy) return;
    setJoinBusy(true);
    try {
      const status = await leaveCommunity(community.id);
      const copy = leaveStatusCopy(status, t);
      Alert.alert(copy.title, copy.message);
      if (status === 'left') await load();
    } catch (leaveError) {
      Alert.alert(t('communitiesSomethingWentWrong'), leaveError instanceof Error ? leaveError.message : t('createTryAgain'));
    } finally {
      setJoinBusy(false);
    }
  }

  function joinButtonState(): { disabled: boolean; label: string; onPress?: () => void; variant: 'primary' | 'secondary' | 'danger' } {
    if (!community) return { disabled: true, label: '', variant: 'secondary' };
    if (community.user_id === viewerId) return { disabled: true, label: t('communitiesOwnerLabel'), variant: 'secondary' };
    if (!isWithinCommunityRadius(community, userLocation)) return { disabled: true, label: t('communitiesOutsideAreaLabel'), variant: 'secondary' };
    const member = isMember();
    if (community.private && !member) return { disabled: false, label: t('communitiesRequestToJoin'), onPress: () => void handleJoin(), variant: 'primary' };
    if (member) return { disabled: false, label: t('communitiesLeaveCommunity'), onPress: () => void handleLeave(), variant: 'danger' };
    return { disabled: false, label: t('communitiesJoinCommunity'), onPress: () => void handleJoin(), variant: 'primary' };
  }

  async function saveEdit() {
    if (!community || !viewerId || savingEdit) return;
    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length > 100) {
      setEditError(t('communitiesNameLength'));
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
      await updateCommunityInfo(community.id, viewerId, { name: trimmedName, description: trimmedDescription });
      setCommunity((current) => (current ? { ...current, name: trimmedName, description: trimmedDescription } : current));
      setEditOpen(false);
    } catch (editSaveError) {
      setEditError(editSaveError instanceof Error ? editSaveError.message : t('communitiesUpdateFailed'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function pickAndUploadPicture() {
    if (!community || !viewerId || pictureUploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('communitiesPhotoAccessTitle'), t('communitiesPhotoAccessPictureMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const extension = mimeType.split('/')[1] ?? 'jpg';
    setPictureUploading(true);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${viewerId}/${community.id}/picture.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('Community Images')
        .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('Community Images').getPublicUrl(path).data.publicUrl;
      await setCommunityPicture(community.id, publicUrl);
      setCommunity((current) => (current ? { ...current, picture_url: publicUrl } : current));
    } catch (pictureError) {
      Alert.alert(t('communitiesUploadFailedTitle'), pictureError instanceof Error ? pictureError.message : t('communitiesPictureUpdateFailed'));
    } finally {
      setPictureUploading(false);
    }
  }

  async function pickAndUploadBanner() {
    if (!community || bannerUploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('communitiesPhotoAccessTitle'), t('communitiesPhotoAccessBannerMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setBannerUploading(true);
    try {
      const bannerUrl = await uploadCommunityBanner(community.id, {
        uri: asset.uri,
        name: asset.fileName ?? `banner.${mimeType.split('/')[1] ?? 'jpg'}`,
        type: mimeType,
      });
      setCommunity((current) => (current ? { ...current, banner_url: bannerUrl } : current));
    } catch (bannerError) {
      Alert.alert(t('communitiesUploadFailedTitle'), bannerError instanceof Error ? bannerError.message : t('communitiesBannerUpdateFailed'));
    } finally {
      setBannerUploading(false);
    }
  }

  async function removeBanner() {
    if (!community || bannerUploading) return;
    setBannerUploading(true);
    try {
      await uploadCommunityBanner(community.id, null);
      setCommunity((current) => (current ? { ...current, banner_url: null } : current));
    } catch (bannerError) {
      Alert.alert(t('communitiesSomethingWentWrong'), bannerError instanceof Error ? bannerError.message : t('communitiesBannerRemoveFailed'));
    } finally {
      setBannerUploading(false);
    }
  }

  async function togglePrivacy(next: boolean) {
    if (!community || privacyUpdating) return;
    setPrivacyUpdating(true);
    try {
      const madePrivate = await setCommunityPrivacy(community.id, next);
      setCommunity((current) => (current ? { ...current, private: madePrivate } : current));
    } catch (privacyError) {
      Alert.alert(t('communitiesSomethingWentWrong'), privacyError instanceof Error ? privacyError.message : t('communitiesPrivacyUpdateFailed'));
    } finally {
      setPrivacyUpdating(false);
    }
  }

  async function respond(requesterId: string, approve: boolean) {
    if (!community || respondingId) return;
    setRespondingId(requesterId);
    try {
      const result: JoinRequestResponse = await respondToJoinRequest(community.id, requesterId, approve);
      if (result === 'request_not_found') {
        Alert.alert(t('communitiesRequestUnavailableTitle'), t('communitiesRequestUnavailableMessage'));
      }
      setPendingRequests((current) => current.filter((request) => request.id !== requesterId));
      if (result === 'approved') await load();
    } catch (respondError) {
      Alert.alert(t('communitiesSomethingWentWrong'), respondError instanceof Error ? respondError.message : t('createTryAgain'));
    } finally {
      setRespondingId(null);
    }
  }

  function confirmDelete() {
    Alert.alert(t('communitiesDeleteTitle'), t('communitiesDeleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => void handleDelete() },
    ]);
  }

  async function handleDelete() {
    if (!community || deleting) return;
    setDeleting(true);
    try {
      const deleted = await deleteCommunity(community.id);
      if (deleted) {
        router.back();
      } else {
        Alert.alert(t('communitiesSomethingWentWrong'), t('communitiesDeleteFailed'));
      }
    } catch (deleteError) {
      Alert.alert(t('communitiesSomethingWentWrong'), deleteError instanceof Error ? deleteError.message : t('communitiesDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t('headerCommunity')} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (notFound || !community) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t('headerCommunity')} />
        <View style={styles.center}><EmptyState helpText={t('communitiesNotFoundHelp')} title={t('communitiesNotFoundTitle')} /></View>
      </SafeAreaView>
    );
  }

  const isOwner = community.user_id === viewerId;
  const joinState = joinButtonState();

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.bannerWrap}>
        {isHttpsImage(community.banner_url) ? (
          <Image source={{ uri: community.banner_url }} style={styles.banner} />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder]} />
        )}
      </View>

      <View style={styles.identityRow}>
        <View style={styles.pictureWrap}>
          {isHttpsImage(community.picture_url) ? (
            <Image source={{ uri: community.picture_url }} style={styles.pictureImage} />
          ) : (
            <Text style={styles.pictureFallback}>{community.name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.identityText}>
          <Text style={styles.communityName}>{community.name}</Text>
          <Text style={styles.communityScope}>{t(scopeLabelKey(community))}</Text>
        </View>
      </View>

      {community.description ? <Text style={styles.communityDescription}>{community.description}</Text> : null}

      <Button
        disabled={joinState.disabled || joinBusy}
        label={joinBusy ? t('communitiesPleaseWait') : joinState.label}
        loading={joinBusy}
        onPress={joinState.onPress ?? (() => {})}
        variant={joinState.variant}
      />

      <View style={styles.sectionHeadingRow}>
        <Users color={colors.textSecondary} size={18} />
        <Text style={styles.sectionHeading}>{t('communitiesMembersHeading', { count: members.length })}</Text>
      </View>
      <View style={styles.membersList}>
        {members.map(({ id: memberId, profile }) => {
          const avatarUrl = resolveAvatarUrl(profile?.avatar_url);
          const name = profile?.display_name || profile?.username || t('communitiesDefaultUserName');
          return (
            <Pressable key={memberId} onPress={() => router.push(`/profile/${memberId}`)} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.memberAvatarImage} />
                ) : (
                  <Text style={styles.memberAvatarFallback}>{name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <Text numberOfLines={1} style={styles.memberName}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>{t('communitiesSubcommunitiesHeading')}</Text>
      </View>
      <View style={styles.subList}>
        {subCommunities.map((sub) => (
          <Pressable key={sub.id} onPress={() => router.push(`/communities/${id}/sub/${sub.id}`)} style={styles.subRow}>
            <View style={styles.subBody}>
              <Text style={styles.subTitle}>{sub.title}</Text>
              {sub.description ? <Text numberOfLines={2} style={styles.subDescription}>{sub.description}</Text> : null}
            </View>
            {sub.is_member ? <Text style={styles.subBadge}>{sub.is_owner ? t('communitiesOwnerBadge') : t('communitiesJoinedBadge')}</Text> : null}
          </Pressable>
        ))}
        {!subCommunities.length ? <Text style={styles.mutedInline}>{t('communitiesNoSubcommunities')}</Text> : null}
        {canCreateSub ? (
          <Pressable onPress={() => router.push(`/communities/${id}/sub/create`)} style={styles.actionRow}>
            <Text style={styles.actionRowText}>{t('communitiesCreateSubcommunity')}</Text>
          </Pressable>
        ) : null}
      </View>

      {isOwner ? (
        <View style={styles.ownerSection}>
          <View style={styles.sectionHeadingRow}>
            <Settings color={colors.textSecondary} size={18} />
            <Text style={styles.sectionHeading}>{t('communitiesOwnerToolsHeading')}</Text>
          </View>

          {editOpen ? (
            <View style={styles.inlineForm}>
              <TextInput maxLength={100} onChangeText={setEditName} placeholder={t('communitiesNameLabel')} placeholderTextColor={colors.textPlaceholder} style={styles.input} value={editName} />
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
                <Button label={t('cancel')} onPress={() => { setEditOpen(false); setEditName(community.name); setEditDescription(community.description ?? ''); setEditError(''); }} variant="secondary" />
                <Button label={t('save')} loading={savingEdit} onPress={() => void saveEdit()} />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setEditOpen(true)} style={styles.actionRow}>
              <Text style={styles.actionRowText}>{t('communitiesEditNameDescription')}</Text>
            </Pressable>
          )}

          <Pressable disabled={pictureUploading} onPress={() => void pickAndUploadPicture()} style={styles.actionRow}>
            {pictureUploading ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.actionRowText}>{t('communitiesChangePicture')}</Text>}
          </Pressable>

          <Pressable disabled={bannerUploading} onPress={() => void pickAndUploadBanner()} style={styles.actionRow}>
            {bannerUploading ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.actionRowText}>{t('communitiesChangeBanner')}</Text>}
          </Pressable>
          {community.banner_url ? (
            <Pressable disabled={bannerUploading} onPress={() => void removeBanner()} style={styles.actionRow}>
              <Text style={styles.actionRowText}>{t('communitiesRemoveBanner')}</Text>
            </Pressable>
          ) : null}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('createCommunityPrivateLabel')}</Text>
            {privacyUpdating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                onValueChange={(value) => void togglePrivacy(value)}
                thumbColor={community.private ? colors.primaryDark : '#F5F5F5'}
                trackColor={{ false: '#CED4CE', true: '#B7C7AD' }}
                value={community.private === true}
              />
            )}
          </View>

          {pendingRequests.length ? (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingHeading}>{t('communitiesPendingRequestsHeading')}</Text>
              {pendingRequests.map(({ id: requesterId, profile }) => {
                const name = profile?.display_name || profile?.username || t('communitiesDefaultUserName');
                const busy = respondingId === requesterId;
                return (
                  <View key={requesterId} style={styles.pendingRow}>
                    <Text numberOfLines={1} style={styles.pendingName}>{name}</Text>
                    {busy ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={styles.pendingActions}>
                        <Pressable onPress={() => void respond(requesterId, true)} style={styles.approveButton}>
                          <Text style={styles.approveButtonText}>{t('communitiesApprove')}</Text>
                        </Pressable>
                        <Pressable onPress={() => void respond(requesterId, false)} style={styles.denyButton}>
                          <Text style={styles.denyButtonText}>{t('communitiesDeny')}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}

          <Pressable disabled={deleting} onPress={confirmDelete} style={styles.deleteRow}>
            <Trash2 color={colors.dangerText} size={16} />
            {deleting ? <ActivityIndicator color={colors.dangerText} /> : <Text style={styles.deleteRowText}>{t('communitiesDeleteCommunity')}</Text>}
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionHeading}>{t('communitiesPostsHeading')}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={community.name} />
      <FlatList
        contentContainerStyle={styles.content}
        data={posts}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={<Text style={styles.mutedInline}>{t('communitiesNoPostsYet')}</Text>}
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
  headerContent: { gap: 12, marginBottom: 4 },
  bannerWrap: { marginHorizontal: -14, marginTop: -14 },
  banner: { width: '100%', height: 140 },
  bannerPlaceholder: { backgroundColor: colors.primarySoft },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -30 },
  pictureWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  pictureImage: { width: '100%', height: '100%' },
  pictureFallback: { color: colors.textOnPrimary, fontSize: 24, fontWeight: '800' },
  identityText: { flex: 1, minWidth: 0, gap: 2, marginTop: 20 },
  communityName: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  communityScope: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  communityDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  sectionHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  membersList: { gap: 8 },
  memberRow: { minHeight: 52, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  memberAvatarImage: { width: '100%', height: '100%' },
  memberAvatarFallback: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '800' },
  memberName: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  subList: { gap: 8 },
  subRow: { minHeight: 56, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 10 },
  subBody: { flex: 1, minWidth: 0, gap: 2 },
  subTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  subDescription: { color: colors.textFaint, fontSize: 12, lineHeight: 17 },
  subBadge: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  mutedInline: { color: colors.textFaint, fontSize: 13, paddingVertical: 8 },
  actionRow: { minHeight: 42, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionRowText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  ownerSection: { gap: 10, marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSoft },
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
  toggleRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  pendingSection: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong },
  pendingHeading: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pendingName: { flex: 1, color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  pendingActions: { flexDirection: 'row', gap: 6 },
  approveButton: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  approveButtonText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '700' },
  denyButton: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.dangerBackground, alignItems: 'center', justifyContent: 'center' },
  denyButtonText: { color: colors.dangerText, fontSize: 12, fontWeight: '700' },
  deleteRow: { minHeight: 42, borderRadius: 10, backgroundColor: colors.dangerBackground, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  deleteRowText: { color: colors.dangerText, fontWeight: '700', fontSize: 14 },
});
