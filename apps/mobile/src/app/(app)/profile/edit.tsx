import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import {
  getPublicProfile,
  isUsernameAvailable,
  moderateUsername,
  resolveAvatarUrl,
  updateProfile,
  uploadAvatar,
} from '@/lib/profiles';
import { usernameError } from '@/lib/validators';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [bio, setBio] = useState('');
  const [supporter, setSupporter] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pickedAvatar, setPickedAvatar] = useState<{ name: string; type: string; uri: string } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getPublicProfile(userId).then((profile) => {
      if (!active || !profile) return;
      setDisplayName(profile.display_name ?? '');
      setUsername(profile.username ?? '');
      setOriginalUsername(profile.username ?? '');
      setBio(profile.bio ?? '');
      setSupporter(profile.supporter === true);
      setAvatarUrl(resolveAvatarUrl(profile.avatar_url));
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const bioLimit = supporter ? 1500 : 500;

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('communitiesPhotoAccessTitle'), t('profileEditPhotoAccessMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const allowedTypes = supporter
      ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      : ['image/jpeg', 'image/png', 'image/webp'];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!allowedTypes.includes(mimeType)) {
      Alert.alert(t('profileEditUnsupportedFileTitle'), supporter ? t('profileEditUnsupportedFileSupporterMessage') : t('profileEditUnsupportedFileMessage'));
      return;
    }
    const maxBytes = (supporter ? 15 : 5) * 1024 * 1024;
    if (asset.fileSize && asset.fileSize > maxBytes) {
      Alert.alert(t('profileEditFileTooLargeTitle'), t('profileEditFileTooLargeMessage', { size: supporter ? 15 : 5 }));
      return;
    }

    setPickedAvatar({ uri: asset.uri, type: mimeType, name: asset.fileName ?? `avatar.${mimeType.split('/')[1]}` });
    setAvatarUrl(asset.uri);
  }

  async function submit() {
    if (submitting || !userId) return;
    setError('');

    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName || trimmedName.length > 50) return setError(t('profileEditDisplayNameLength'));
    const usernameIssue = usernameError(trimmedUsername, t);
    if (usernameIssue) return setError(usernameIssue);
    if (bio.length > bioLimit) return setError(t('profileEditBioLength', { limit: bioLimit }));

    setSubmitting(true);
    try {
      if (trimmedUsername.toLowerCase() !== originalUsername.toLowerCase()) {
        const approved = await moderateUsername(trimmedUsername);
        if (!approved) throw new Error(t('registerUsernameNotAllowed'));
        const available = await isUsernameAvailable(trimmedUsername);
        if (!available) throw new Error(t('registerUsernameTaken'));
      }

      if (pickedAvatar) {
        setUploadingAvatar(true);
        await uploadAvatar(pickedAvatar);
        setUploadingAvatar(false);
      }

      await updateProfile({ displayName: trimmedName, username: trimmedUsername, bio });

      Alert.alert(t('profileEditUpdatedTitle'), t('profileEditUpdatedMessage'), [
        { text: t('postEditOk'), onPress: () => router.back() },
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('profileEditUpdateFailed'));
    } finally {
      setUploadingAvatar(false);
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerEditProfile')} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => void pickAvatar()} style={styles.avatarPicker}>
              <View style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarFallback}>{displayName.slice(0, 1).toUpperCase() || '?'}</Text>
                )}
                {uploadingAvatar ? (
                  <View style={styles.avatarOverlay}><ActivityIndicator color={colors.textOnPrimary} /></View>
                ) : null}
              </View>
              <Text style={styles.avatarHint}>{t('profileEditChangePhoto')}</Text>
            </Pressable>

            <Text style={styles.label}>{t('profileEditDisplayName')}</Text>
            <TextInput maxLength={50} onChangeText={setDisplayName} placeholderTextColor={colors.textPlaceholder} style={styles.input} value={displayName} />

            <Text style={styles.label}>{t('profileEditUsername')}</Text>
            <TextInput autoCapitalize="none" maxLength={30} onChangeText={setUsername} placeholderTextColor={colors.textPlaceholder} style={styles.input} value={username} />

            <Text style={styles.label}>{t('profileEditBio')}</Text>
            <TextInput
              maxLength={bioLimit}
              multiline
              onChangeText={setBio}
              placeholder={t('profileEditBioPlaceholder')}
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.input, styles.bioInput]}
              textAlignVertical="top"
              value={bio}
            />
            <Text style={styles.charCount}>{bio.length}/{bioLimit}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button label={t('postEditSaveChanges')} loading={submitting} onPress={() => void submit()} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 8 },
  avatarPicker: { alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { color: colors.textOnPrimary, fontSize: 32, fontWeight: '800' },
  avatarOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  avatarHint: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 6 },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontSize: 15,
  },
  bioInput: { minHeight: 100 },
  charCount: { alignSelf: 'flex-end', color: colors.textFaint, fontSize: 11 },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
});
