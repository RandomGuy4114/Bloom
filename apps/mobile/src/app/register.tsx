import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';

import Button from '@/components/Button';
import { isUsernameAvailable, moderateUsername } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';
import { birthdayError, oldestAllowedBirthday, passwordError, thirteenYearsAgo, usernameError } from '@/lib/validators';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function changeBirthday(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setBirthday(selectedDate);
  }

  async function submit() {
    if (submitting) return;
    setError('');

    if (!username.trim() || !email.trim() || !password || !birthday) {
      setError(t('registerFillAllFields'));
      return;
    }
    const usernameIssue = usernameError(username.trim(), t);
    if (usernameIssue) return setError(usernameIssue);
    const passwordIssue = passwordError(password, t);
    if (passwordIssue) return setError(passwordIssue);
    const birthdayIssue = birthdayError(birthday, t);
    if (birthdayIssue) return setError(birthdayIssue);
    if (!acceptedTerms) return setError(t('registerAcceptTermsRequired'));

    setSubmitting(true);
    try {
      const approved = await moderateUsername(username.trim());
      if (!approved) throw new Error(t('registerUsernameNotAllowed'));

      const available = await isUsernameAvailable(username.trim());
      if (!available) throw new Error(t('registerUsernameTaken'));

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: 'mobile://confirm',
          data: {
            username: username.trim(),
            display_name: username.trim(),
            birthday: birthday.toISOString().slice(0, 10),
            accepted_terms: true,
            terms_version: '2026-07-13',
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (signUpError) throw signUpError;

      Alert.alert(t('registerCheckEmailTitle'), t('registerCheckEmailMessage'), [
        { text: t('resetBackToLogin'), onPress: () => router.replace('/login') },
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('registerFailedGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.titleText}>{t('registerTitle')}</Text>
          <Text style={styles.descriptionText}>{t('registerSubtitle')}</Text>

          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder={t('registerUsernamePlaceholder')}
            placeholderTextColor={colors.textPlaceholder}
            style={styles.input}
            value={username}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t('email')}
            placeholderTextColor={colors.textPlaceholder}
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder={t('password')}
            placeholderTextColor={colors.textPlaceholder}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <Text style={styles.helpText}>{t('registerPasswordHelp')}</Text>

          {Platform.OS === 'ios' ? (
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>{t('registerDateOfBirth')}</Text>
              <DateTimePicker
                display="compact"
                maximumDate={thirteenYearsAgo()}
                minimumDate={oldestAllowedBirthday()}
                mode="date"
                onChange={changeBirthday}
                value={birthday ?? thirteenYearsAgo()}
              />
            </View>
          ) : (
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text style={birthday ? styles.dateValueText : styles.datePlaceholderText}>
                {birthday ? birthday.toLocaleDateString() : t('registerDateOfBirth')}
              </Text>
            </Pressable>
          )}
          {Platform.OS === 'android' && showDatePicker ? (
            <DateTimePicker
              maximumDate={thirteenYearsAgo()}
              minimumDate={oldestAllowedBirthday()}
              mode="date"
              onChange={changeBirthday}
              value={birthday ?? thirteenYearsAgo()}
            />
          ) : null}

          <Pressable onPress={() => setAcceptedTerms((value) => !value)} style={styles.termsRow}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]} />
            <Text style={styles.termsText}>
              {t('registerAgreeToPrefix')}{' '}
              <Link href="/(app)/legal/terms">
                <Text style={styles.termsLink}>{t('headerTermsOfService')}</Text>
              </Link>
              {' '}{t('registerAgreeToAnd')}{' '}
              <Link href="/(app)/legal/privacy">
                <Text style={styles.termsLink}>{t('headerPrivacyPolicy')}</Text>
              </Link>
            </Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label={t('registerCreateAccountButton')} loading={submitting} onPress={() => void submit()} />

          <Pressable onPress={() => router.back()} style={styles.linkButton}>
            <Text style={styles.linkText}>{t('registerAlreadyHaveAccount')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.backgroundAlt },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleText: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  descriptionText: { fontSize: 14, color: colors.textFaint, textAlign: 'center', marginBottom: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 13,
    justifyContent: 'center',
    color: colors.textPrimary,
    fontSize: 15,
  },
  helpText: { color: colors.textFaint, fontSize: 11, marginTop: -4 },
  dateRow: { minHeight: 46, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.inputBackground, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  dateValueText: { color: colors.textPrimary, fontSize: 15 },
  datePlaceholderText: { color: colors.textPlaceholder, fontSize: 15 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.borderInput, marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  termsLink: { color: colors.primaryDark, fontWeight: '700' },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
  linkButton: { alignSelf: 'center', marginTop: 4, paddingVertical: 6 },
  linkText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
