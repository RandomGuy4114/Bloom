import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import { createSubCommunity } from '@/lib/communities';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

export default function CreateSubCommunityScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!id || submitting) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length > 100) {
      setError(t('subTitleLength'));
      return;
    }
    if (description.length > 1000) {
      setError(t('createCommunityDescriptionLength'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const newId = await createSubCommunity(id, trimmedTitle, description.trim());
      router.replace(`/communities/${id}/sub/${newId}`);
    } catch (submitError) {
      const code = (submitError as { code?: string } | null)?.code;
      if (code === '23505') {
        setError(t('subDuplicateError'));
      } else {
        setError(submitError instanceof Error ? submitError.message : t('subCreateFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerCreateSubCommunity')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('subTitleLabel')}</Text>
          <TextInput
            maxLength={100}
            onChangeText={setTitle}
            placeholder={t('subTitlePlaceholder')}
            placeholderTextColor={colors.textPlaceholder}
            style={styles.input}
            value={title}
          />

          <Text style={styles.label}>{t('createCommunityDescriptionLabel')}</Text>
          <TextInput
            maxLength={1000}
            multiline
            onChangeText={setDescription}
            placeholder={t('subDescriptionPlaceholder')}
            placeholderTextColor={colors.textPlaceholder}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
            value={description}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label={t('subCreateButton')} loading={submitting} onPress={() => void submit()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
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
  textArea: { minHeight: 100 },
  charCount: { alignSelf: 'flex-end', color: colors.textFaint, fontSize: 11 },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
});
