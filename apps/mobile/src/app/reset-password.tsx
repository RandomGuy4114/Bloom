import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { passwordError } from '@/lib/validators';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  const [exchanging, setExchanging] = useState(Boolean(code));
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updated, setUpdated] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;
    let active = true;
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (!active) return;
      if (exchangeError) {
        setLinkError(t('resetLinkInvalid'));
      } else {
        setSessionReady(true);
      }
      setExchanging(false);
    });
    return () => { active = false; };
  }, [code]);

  async function requestResetEmail() {
    if (submitting) return;
    if (!email.trim()) {
      setError(t('resetEnterEmail'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'mobile://reset-password' });
      setRequestSent(true);
    } catch {
      setRequestSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function setNewPasswordSubmit() {
    if (submitting) return;
    const issue = passwordError(newPassword, t);
    if (issue) return setError(issue);
    if (newPassword !== confirmPassword) return setError(t('resetPasswordsMismatch'));

    setError('');
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setUpdated(true);
      await supabase.auth.signOut();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('resetPasswordUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (exchanging) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {sessionReady ? (
            updated ? (
              <>
                <Text style={styles.titleText}>{t('resetPasswordUpdatedTitle')}</Text>
                <Text style={styles.descriptionText}>{t('resetPasswordUpdatedDescription')}</Text>
                <Button label={t('resetGoToLogin')} onPress={() => router.replace('/login')} />
              </>
            ) : (
              <>
                <Text style={styles.titleText}>{t('resetSetNewPasswordTitle')}</Text>
                <Text style={styles.descriptionText}>{t('resetSetNewPasswordDescription')}</Text>
                <TextInput
                  onChangeText={setNewPassword}
                  placeholder={t('resetNewPasswordPlaceholder')}
                  placeholderTextColor={colors.textPlaceholder}
                  secureTextEntry
                  style={styles.input}
                  value={newPassword}
                />
                <TextInput
                  onChangeText={setConfirmPassword}
                  placeholder={t('resetConfirmPasswordPlaceholder')}
                  placeholderTextColor={colors.textPlaceholder}
                  secureTextEntry
                  style={styles.input}
                  value={confirmPassword}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Button label={t('resetUpdatePasswordButton')} loading={submitting} onPress={() => void setNewPasswordSubmit()} />
              </>
            )
          ) : (
            <>
              <Text style={styles.titleText}>{t('resetYourPasswordTitle')}</Text>
              <Text style={styles.descriptionText}>
                {linkError || t('resetYourPasswordDescription')}
              </Text>
              {requestSent ? (
                <Text style={styles.successText}>{t('resetLinkSentMessage')}</Text>
              ) : (
                <>
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
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <Button label={t('resetSendLinkButton')} loading={submitting} onPress={() => void requestResetEmail()} />
                </>
              )}
              <Pressable onPress={() => router.replace('/login')} style={styles.linkButton}>
                <Text style={styles.linkText}>{t('resetBackToLogin')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.backgroundAlt },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleText: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  descriptionText: { fontSize: 14, color: colors.textFaint, textAlign: 'center' },
  successText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: 10 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 13,
    color: colors.textPrimary,
    fontSize: 15,
  },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
  linkButton: { alignSelf: 'center', marginTop: 4, paddingVertical: 6 },
  linkText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
