import { useMemo, useState } from 'react';
import {
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
import { Link, useRouter } from 'expo-router';

import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (loading) return;
    if (!email.trim() || !password) {
      setError(t('loginMissingFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.replace('/');
    } catch {
      setError(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image resizeMode="contain" source={require('@/assets/images/bloom-logo.png')} style={styles.logo} />
          <Text style={styles.titleText}>{t('loginTitle')}</Text>
          <Text style={styles.descriptionText}>{t('loginSubtitle')}</Text>

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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label={t('loginButton')} loading={loading} onPress={() => void login()} />

          <Pressable onPress={() => router.push('/reset-password')} style={styles.linkButton}>
            <Text style={styles.linkText}>{t('forgotPasswordLink')}</Text>
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t('loginNewToBloom')} </Text>
            <Link href="/register">
              <Text style={styles.registerLink}>{t('loginCreateAccount')}</Text>
            </Link>
          </View>
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
    alignItems: 'center',
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: { width: 56, height: 56, marginBottom: 4 },
  titleText: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  descriptionText: { fontSize: 14, color: colors.textFaint, textAlign: 'center', marginBottom: 6 },
  input: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 13,
    color: colors.textPrimary,
    fontSize: 15,
  },
  errorText: { width: '100%', color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
  linkButton: { marginTop: 2, paddingVertical: 6 },
  linkText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  registerRow: { flexDirection: 'row', marginTop: 6 },
  registerText: { color: colors.textFaint, fontSize: 13 },
  registerLink: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
