import { Minus, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { createCommunity } from '@/lib/communities';
import { getPublicProfile } from '@/lib/profiles';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

const MIN_RADIUS_METERS = 100;
const RADIUS_STEP_METERS = 500;
const RADIUS_PRESETS_METERS = [1000, 5000, 10000, 25000];

function formatRadius(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km` : `${meters} m`;
}

export default function CreateCommunityScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [supporter, setSupporter] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const maxRadius = supporter ? 40000 : 25000;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getPublicProfile(userId).then((profile) => {
      if (active && profile) setSupporter(profile.supporter === true);
    }).catch(() => {});
    return () => { active = false; };
  }, [userId]);

  async function requestLocation() {
    setLocationStatus('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setLocation(null);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationStatus('granted');
    } catch {
      setLocationStatus('denied');
      setLocation(null);
    }
  }

  useEffect(() => {
    void requestLocation();
  }, []);

  useEffect(() => {
    setRadiusMeters((current) => Math.min(current, maxRadius));
  }, [maxRadius]);

  function adjustRadius(delta: number) {
    setRadiusMeters((current) => Math.min(maxRadius, Math.max(MIN_RADIUS_METERS, current + delta)));
  }

  async function submit() {
    if (submitting || !userId) return;
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      setError(t('createCommunityNameLength'));
      return;
    }
    if (description.length > 1000) {
      setError(t('createCommunityDescriptionLength'));
      return;
    }
    if (!location) {
      setError(t('createCommunityLocationRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const newId = await createCommunity({
        name: trimmedName,
        description: description.trim(),
        isPrivate,
        location,
        pictureUrl: null,
        radiusMeters,
        userId,
      });
      router.replace(`/communities/${newId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('createCommunityFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={t('headerCreateCommunity')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('createCommunityNameLabel')}</Text>
          <TextInput
            maxLength={100}
            onChangeText={setName}
            placeholder={t('createCommunityNamePlaceholder')}
            placeholderTextColor={colors.textPlaceholder}
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>{t('createCommunityDescriptionLabel')}</Text>
          <TextInput
            maxLength={1000}
            multiline
            onChangeText={setDescription}
            placeholder={t('createCommunityDescriptionPlaceholder')}
            placeholderTextColor={colors.textPlaceholder}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
            value={description}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>

          <Text style={styles.hint}>{t('createCommunityPictureHint')}</Text>

          <Text style={styles.label}>{t('createCommunityRadiusLabel')}</Text>
          <View style={styles.radiusRow}>
            <Pressable
              accessibilityLabel={t('createCommunityDecreaseRadius')}
              disabled={radiusMeters <= MIN_RADIUS_METERS}
              onPress={() => adjustRadius(-RADIUS_STEP_METERS)}
              style={[styles.stepperButton, radiusMeters <= MIN_RADIUS_METERS && styles.stepperButtonDisabled]}
            >
              <Minus color={colors.textPrimary} size={18} />
            </Pressable>
            <Text style={styles.radiusValue}>{formatRadius(radiusMeters)}</Text>
            <Pressable
              accessibilityLabel={t('createCommunityIncreaseRadius')}
              disabled={radiusMeters >= maxRadius}
              onPress={() => adjustRadius(RADIUS_STEP_METERS)}
              style={[styles.stepperButton, radiusMeters >= maxRadius && styles.stepperButtonDisabled]}
            >
              <Plus color={colors.textPrimary} size={18} />
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {RADIUS_PRESETS_METERS.filter((preset) => preset <= maxRadius).map((preset) => {
              const selected = radiusMeters === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setRadiusMeters(preset)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{formatRadius(preset)}</Text>
                </Pressable>
              );
            })}
          </View>
          {supporter ? (
            <Text style={styles.hint}>{t('createCommunitySupporterRadiusHint')}</Text>
          ) : (
            <Text style={styles.hint}>{t('createCommunityNonSupporterRadiusHint')}</Text>
          )}

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleLabel}>{t('createCommunityPrivateLabel')}</Text>
              <Text style={styles.hint}>{t('createCommunityPrivateHint')}</Text>
            </View>
            <Switch
              onValueChange={setIsPrivate}
              thumbColor={isPrivate ? colors.primaryDark : '#F5F5F5'}
              trackColor={{ false: '#CED4CE', true: '#B7C7AD' }}
              value={isPrivate}
            />
          </View>

          {locationStatus !== 'granted' ? (
            <View style={styles.locationNotice}>
              {locationStatus === 'loading' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.locationNoticeText}>
                    {t('createCommunityLocationRequired')}
                  </Text>
                  <Pressable onPress={() => void requestLocation()} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>{t('retry')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            disabled={locationStatus !== 'granted'}
            label={t('createCommunitySubmitButton')}
            loading={submitting}
            onPress={() => void submit()}
          />
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
  hint: { color: colors.textFaint, fontSize: 12, lineHeight: 17 },
  radiusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 4 },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.chipInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: { opacity: 0.4 },
  radiusValue: { minWidth: 90, textAlign: 'center', color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, justifyContent: 'center' },
  chip: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.chipInactive, alignItems: 'center', justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.chipInactiveText, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: colors.textOnPrimary },
  toggleRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleCopy: { flex: 1, gap: 3 },
  toggleLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  locationNotice: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    gap: 8,
  },
  locationNoticeText: { color: colors.dangerText, fontSize: 13, textAlign: 'center' },
  retryButton: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { color: colors.dangerText, fontSize: 12, fontWeight: '700' },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 10, borderRadius: 10, fontSize: 13 },
});
