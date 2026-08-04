import { ChevronRight, Lock, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { type LanguageCode, useLanguage } from '@/context/LanguageContext';
import { availableThemes, type ThemeName, useTheme } from '@/context/ThemeContext';
import { getConnectSummary, setConnectEnabled } from '@/lib/connect';
import { supabase } from '@/lib/supabase';
import { passwordError } from '@/lib/validators';
import type { ThemePalette } from '@/theme/colors';

const THEME_LABELS: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  forest: 'Forest',
  midnight: 'Midnight',
  sunset: 'Sunset',
  'frutiger-aero': 'Frutiger Aero',
};

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
};

function SettingsCard({ children, description, title }: { children: React.ReactNode; description?: string; title: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}

function ChangePasswordSection({ email }: { email: string }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError('');
    if (!currentPassword) return setError(t('settingsEnterCurrentPassword'));
    const issue = passwordError(newPassword, t);
    if (issue) return setError(issue);
    if (newPassword !== confirmPassword) return setError(t('settingsNewPasswordsMismatch'));

    setSubmitting(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) throw new Error(t('settingsCurrentPasswordIncorrect'));

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
      Alert.alert(t('settingsPasswordUpdatedTitle'), t('settingsPasswordUpdatedMessage'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('settingsPasswordChangeFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={styles.actionButton}>
        <Text style={styles.actionButtonText}>{t('settingsChangePassword')}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.inlineForm}>
      <TextInput onChangeText={setCurrentPassword} placeholder={t('settingsCurrentPasswordPlaceholder')} placeholderTextColor={colors.textPlaceholder} secureTextEntry style={styles.input} value={currentPassword} />
      <TextInput onChangeText={setNewPassword} placeholder={t('resetNewPasswordPlaceholder')} placeholderTextColor={colors.textPlaceholder} secureTextEntry style={styles.input} value={newPassword} />
      <TextInput onChangeText={setConfirmPassword} placeholder={t('resetConfirmPasswordPlaceholder')} placeholderTextColor={colors.textPlaceholder} secureTextEntry style={styles.input} value={confirmPassword} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.inlineFormActions}>
        <Button label={t('cancel')} onPress={() => setOpen(false)} variant="secondary" />
        <Button label={t('settingsUpdateButton')} loading={submitting} onPress={() => void submit()} />
      </View>
    </View>
  );
}

function DeleteAccountSection() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submit() {
    if (submitting) return;
    if (confirmation.trim() !== 'DELETE') {
      setError(t('settingsTypeDeleteToConfirm'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { data, error: deleteError } = await supabase.functions.invoke('delete-account', {
        body: { confirmation: 'DELETE' },
      });
      if (deleteError) throw new Error(deleteError.message || t('settingsAccountDeleteFailed'));
      if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);

      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/login');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('settingsAccountDeleteFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={[styles.actionButton, styles.dangerButton]}>
        <Text style={styles.dangerButtonText}>{t('settingsDeleteAccount')}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.inlineForm}>
      <Text style={styles.dangerCopy}>{t('settingsDeleteAccountWarning')}</Text>
      <TextInput autoCapitalize="characters" onChangeText={setConfirmation} placeholder="DELETE" placeholderTextColor={colors.textPlaceholder} style={styles.input} value={confirmation} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.inlineFormActions}>
        <Button label={t('cancel')} onPress={() => setOpen(false)} variant="secondary" />
        <Button label={t('settingsDeleteMyAccount')} loading={submitting} onPress={() => void submit()} variant="danger" />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, loading: themeLoading, setTheme, supporter, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, setLanguage, t } = useLanguage();
  const [connectEnabled, setConnectEnabledState] = useState(false);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connectUpdating, setConnectUpdating] = useState(false);
  const [themeUpdating, setThemeUpdating] = useState(false);
  const [languageUpdating, setLanguageUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    getConnectSummary()
      .then((summary) => { if (active) setConnectEnabledState(summary.enabled); })
      .catch(() => {})
      .finally(() => { if (active) setConnectLoading(false); });
    return () => { active = false; };
  }, []);

  async function changeTheme(next: ThemeName) {
    if (themeUpdating || next === theme) return;
    setThemeUpdating(true);
    try {
      await setTheme(next);
    } catch (themeError) {
      Alert.alert(t('settingsThemeUnavailableTitle'), themeError instanceof Error ? themeError.message : t('settingsThemeApplyFailed'));
    } finally {
      setThemeUpdating(false);
    }
  }

  async function changeLanguage(next: LanguageCode) {
    if (languageUpdating || next === language) return;
    setLanguageUpdating(true);
    try {
      await setLanguage(next);
    } finally {
      setLanguageUpdating(false);
    }
  }

  async function toggleConnect(next: boolean) {
    if (connectUpdating) return;
    setConnectUpdating(true);
    try {
      const saved = await setConnectEnabled(next);
      setConnectEnabledState(saved);
    } catch (connectError) {
      Alert.alert(t('settingsConnectTitle'), connectError instanceof Error ? connectError.message : t('settingsConnectUpdateFailed'));
    } finally {
      setConnectUpdating(false);
    }
  }

  function logout() {
    Alert.alert(t('logOut'), t('settingsLogOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logOut'), style: 'destructive', onPress: () => void supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('headerSettings')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push('/profile/edit')} style={styles.profileLink}>
          <View>
            <Text style={styles.profileLinkTitle}>{t('settingsEditProfile')}</Text>
            <Text style={styles.profileLinkSubtitle}>{t('settingsEditProfileSubtitle')}</Text>
          </View>
          <ChevronRight color={colors.textFaint} size={20} />
        </Pressable>

        <SettingsCard description={t('settingsAppearanceDescription')} title={t('appearance')}>
          {themeLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.chipRow}>
              {availableThemes(true).map((name) => {
                const locked = !supporter && !availableThemes(false).includes(name);
                const selected = theme === name;
                return (
                  <Pressable
                    disabled={locked || themeUpdating}
                    key={name}
                    onPress={() => void changeTheme(name)}
                    style={[styles.chip, selected && styles.chipSelected, locked && styles.chipLocked]}
                  >
                    {locked ? <Lock color={colors.textFaint} size={12} /> : null}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{THEME_LABELS[name]}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {!supporter ? (
            <View style={styles.supporterHint}>
              <Sparkles color={colors.supporterGold} size={14} />
              <Text style={styles.supporterHintText}>{t('settingsSupporterHint')}</Text>
            </View>
          ) : null}
        </SettingsCard>

        <SettingsCard description={t('settingsLanguageDescription')} title={t('language')}>
          <View style={styles.chipRow}>
            {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => {
              const selected = language === code;
              return (
                <Pressable
                  disabled={languageUpdating}
                  key={code}
                  onPress={() => void changeLanguage(code)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{LANGUAGE_LABELS[code]}</Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsCard>

        <SettingsCard description={t('settingsEarlyAccessDescription')} title={t('settingsEarlyAccessTitle')}>
          <Pressable onPress={() => router.push('/early-access')} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{t('settingsOpenEarlyAccess')}</Text>
          </Pressable>
        </SettingsCard>

        <SettingsCard description={t('settingsConnectDescription')} title={t('settingsConnectTitle')}>
          {connectLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{connectEnabled ? t('settingsConnectOn') : t('settingsConnectOff')}</Text>
              {connectUpdating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  onValueChange={(value) => void toggleConnect(value)}
                  thumbColor={connectEnabled ? colors.primaryDark : '#F5F5F5'}
                  trackColor={{ false: '#CED4CE', true: '#B7C7AD' }}
                  value={connectEnabled}
                />
              )}
            </View>
          )}
          <Pressable onPress={() => router.push('/connect')} style={styles.linkRow}>
            <Text style={styles.linkRowText}>{t('settingsViewConnections')}</Text>
            <ChevronRight color={colors.textFaint} size={16} />
          </Pressable>
        </SettingsCard>

        <SettingsCard description={t('settingsSupporterDescription')} title={t('headerSupporter')}>
          <Pressable onPress={() => router.push('/supporter')} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{t('settingsManageSupporterStatus')}</Text>
          </Pressable>
        </SettingsCard>

        <SettingsCard description={t('settingsAccountSettingsDescription')} title={t('settingsAccountSettingsTitle')}>
          {session?.user.email ? <ChangePasswordSection email={session.user.email} /> : null}
          <Pressable onPress={logout} style={[styles.actionButton, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>{t('logOut')}</Text>
          </Pressable>
          <DeleteAccountSection />
        </SettingsCard>

        <SettingsCard title={t('settingsLegalTitle')}>
          <Pressable onPress={() => router.push('/legal/privacy')} style={styles.linkRow}>
            <Text style={styles.linkRowText}>{t('headerPrivacyPolicy')}</Text>
            <ChevronRight color={colors.textFaint} size={16} />
          </Pressable>
          <Pressable onPress={() => router.push('/legal/terms')} style={styles.linkRow}>
            <Text style={styles.linkRowText}>{t('headerTermsOfService')}</Text>
            <ChevronRight color={colors.textFaint} size={16} />
          </Pressable>
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  profileLink: { padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileLinkTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  profileLinkSubtitle: { color: colors.textFaint, fontSize: 12, marginTop: 2, maxWidth: 260 },
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, gap: 10 },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  cardDescription: { color: colors.textFaint, fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.chipInactive },
  chipSelected: { backgroundColor: colors.primary },
  chipLocked: { opacity: 0.6 },
  chipText: { color: colors.chipInactiveText, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: colors.textOnPrimary },
  supporterHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  supporterHintText: { color: colors.textFaint, fontSize: 12 },
  actionButton: { minHeight: 42, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  secondaryButton: { backgroundColor: colors.chipInactive },
  secondaryButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  dangerButton: { backgroundColor: colors.dangerBackground },
  dangerButtonText: { color: colors.dangerText, fontWeight: '700', fontSize: 14 },
  dangerCopy: { color: colors.dangerText, fontSize: 12, lineHeight: 17 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  linkRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRowText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  inlineForm: { gap: 8 },
  inlineFormActions: { flexDirection: 'row', gap: 8 },
  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontSize: 14,
  },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 9, borderRadius: 9, fontSize: 12 },
});
