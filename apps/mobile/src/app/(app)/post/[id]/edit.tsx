import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { fetchPost, updatePost } from '@/lib/posts';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

export default function EditPostScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchPost(id).then((post) => {
      if (!active) return;
      if (post.user_id !== session?.user.id) {
        setForbidden(true);
      } else {
        setTitle(post.title ?? '');
        setBody(post.body ?? '');
      }
      setLoading(false);
    }).catch(() => {
      if (active) { setForbidden(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [id, session?.user.id]);

  async function submit() {
    if (!id || submitting) return;
    if (!title.trim() || !body.trim()) {
      setError(t('postEditMissingFields'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await updatePost(id, { title: title.trim(), body: body.trim() });
      Alert.alert(t('postEditUpdatedTitle'), undefined, [{ text: t('postEditOk'), onPress: () => router.back() }]);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('postEditUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerEditPost')} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : forbidden ? (
        <View style={styles.center}><EmptyState helpText={t('postEditForbiddenHelp')} title={t('postEditForbiddenTitle')} /></View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>{t('createTitlePlaceholder')}</Text>
            <TextInput onChangeText={setTitle} style={styles.input} value={title} />
            <Text style={styles.label}>{t('createCommunityDescriptionLabel')}</Text>
            <TextInput multiline onChangeText={setBody} style={[styles.input, styles.bodyInput]} textAlignVertical="top" value={body} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, gap: 8 },
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
  bodyInput: { minHeight: 140 },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
});
