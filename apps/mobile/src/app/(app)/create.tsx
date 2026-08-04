import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { listSubCommunities, type SubCommunitySummary } from '@/lib/communities';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

type PostType = 'post' | 'activity' | 'event';
type EventLocation = { latitude: number; longitude: number };
type Community = { global: boolean | null; id: string; name: string };

const ACTIVE_COLOR = '#9CB080';
const INACTIVE_COLOR = '#E3E7E2';
const PRESSED_COLOR = '#7F966F';
const INITIAL_REGION = {
  latitude: -25.2867,
  longitude: -57.3333,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function formatPostDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function PostTypeButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const selection = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selection, {
      toValue: selected ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [selected, selection]);

  const backgroundColor = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [INACTIVE_COLOR, ACTIVE_COLOR],
  });
  const color = selection.interpolate({
    inputRange: [0, 1],
    outputRange: ['#536057', '#FFFFFF'],
  });

  return (
    <Animated.View style={[styles.postTypeButton, { backgroundColor }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.postTypeButtonPressable, pressed && styles.buttonPressed]}
      >
        <Animated.Text style={[styles.typeButtonText, { color }]}>{label}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

function SubmitButton({ disabled, loading, onPress }: { disabled: boolean; loading: boolean; onPress: () => void }) {
  const { t } = useLanguage();
  const pressedProgress = useRef(new Animated.Value(0)).current;
  const backgroundColor = pressedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [ACTIVE_COLOR, PRESSED_COLOR],
  });

  function animate(toValue: number) {
    Animated.timing(pressedProgress, {
      toValue,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }

  return (
    <Animated.View style={[styles.submitButton, { backgroundColor }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        style={[styles.submitButtonPressable, disabled && styles.disabledButton]}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('createSubmitButton')}</Text>}
      </Pressable>
    </Animated.View>
  );
}

export default function CreateScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPostType, setSelectedPostType] = useState<PostType>('post');
  const [eventLocation, setEventLocation] = useState<EventLocation | null>(null);
  const [eventDate, setEventDate] = useState(startOfToday);
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [subCommunities, setSubCommunities] = useState<SubCommunitySummary[]>([]);
  const [selectedSubCommunityId, setSelectedSubCommunityId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCommunities() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        if (active) setLoadingCommunities(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('joined_communities')
        .eq('id', userData.user.id)
        .single();
      if (profileError) {
        if (active) setLoadingCommunities(false);
        return;
      }

      const joinedIds = (profile.joined_communities ?? []) as string[];
      if (!joinedIds.length) {
        if (active) setLoadingCommunities(false);
        return;
      }

      const { data, error } = await supabase
        .from('Communities')
        .select('id, name, global')
        .in('id', joinedIds)
        .order('name');
      if (!active) return;
      if (error) {
        setLoadingCommunities(false);
        return;
      }

      const isAdmin = userData.user.app_metadata?.role === 'admin';
      const available = ((data ?? []) as Community[]).filter((community) => !community.global || isAdmin);
      setCommunities(available);
      setSelectedCommunityId((current) => current || available[0]?.id || '');
      setLoadingCommunities(false);
    }

    void loadCommunities();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setSelectedSubCommunityId('');
    if (!selectedCommunityId) {
      setSubCommunities([]);
      return;
    }
    listSubCommunities(selectedCommunityId)
      .then((result) => {
        if (active) setSubCommunities(result.subCommunities.filter((sub) => sub.is_member));
      })
      .catch(() => { if (active) setSubCommunities([]); });
    return () => { active = false; };
  }, [selectedCommunityId]);

  function selectLocation(event: MapPressEvent) {
    if (selectedPostType !== 'event') return;
    setEventLocation(event.nativeEvent.coordinate);
    Keyboard.dismiss();
  }

  async function submitPost() {
    if (submitting) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert(t('createMissingInfoTitle'), t('createMissingInfoMessage'));
      return;
    }
    if (!selectedCommunityId) {
      Alert.alert(t('createCommunityRequiredTitle'), t('createCommunityRequiredMessage'));
      return;
    }
    if (selectedPostType === 'event' && !eventLocation) {
      Alert.alert(t('createLocationRequiredTitle'), t('createLocationRequiredMessage'));
      return;
    }

    const form = new FormData();
    form.append('title', title.trim());
    form.append('body', description.trim());
    form.append('community', selectedCommunityId);
    form.append('postType', selectedPostType);
    form.append('subcommunity', selectedSubCommunityId);
    form.append('location', selectedPostType === 'event' && eventLocation
      ? `${eventLocation.latitude},${eventLocation.longitude}`
      : '');
    form.append('date', selectedPostType === 'event' ? formatPostDate(eventDate) : '');

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-post', { body: form });
      if (error) {
        let message = error.message || t('createPostFailed');
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const response = await context.json() as { error?: string };
            if (response.error) message = response.error;
          } catch {
            // The function returned a non-JSON error response.
          }
        }
        throw new Error(message);
      }

      setTitle('');
      setDescription('');
      setEventLocation(null);
      setEventDate(startOfToday());
      Alert.alert(t('createPostCreatedTitle'), t('createPostCreatedMessage'), [
        { text: t('createViewFeed'), onPress: () => router.replace('/') },
      ]);
    } catch (submitError) {
      Alert.alert(t('createUnableToCreateTitle'), submitError instanceof Error ? submitError.message : t('createTryAgain'));
    } finally {
      setSubmitting(false);
    }
  }

  function changeEventDate(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setShowAndroidDatePicker(false);
    if (event.type === 'set' && selectedDate) setEventDate(selectedDate);
  }

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={INITIAL_REGION}
        onPress={selectLocation}
        pitchEnabled={false}
        rotateEnabled={false}
        style={StyleSheet.absoluteFill}
      >
        {selectedPostType === 'event' && eventLocation ? (
          <Marker coordinate={eventLocation} pinColor={ACTIVE_COLOR} title={t('createEventLocationMarker')} />
        ) : null}
      </MapView>

      <SafeAreaView edges={['top', 'left', 'right']} pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.creatorCard}>
          <View style={styles.creatorHeading}>
            <Text style={styles.heading}>{t('tabCreate')}</Text>
            {selectedPostType === 'event' ? (
              <View style={[styles.locationStatus, eventLocation && styles.locationSelected]}>
                <MapPin color={eventLocation ? '#FFFFFF' : '#647168'} size={14} />
                <Text style={[styles.locationStatusText, eventLocation && styles.locationSelectedText]}>
                  {eventLocation ? t('createLocationSelected') : t('createTapTheMap')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.postTypeWrapper}>
            <PostTypeButton label={t('post')} onPress={() => setSelectedPostType('post')} selected={selectedPostType === 'post'} />
            <PostTypeButton label={t('activityFilterActivity')} onPress={() => setSelectedPostType('activity')} selected={selectedPostType === 'activity'} />
            <PostTypeButton label={t('activityFilterEvent')} onPress={() => setSelectedPostType('event')} selected={selectedPostType === 'event'} />
          </View>

          <View style={styles.communitySection}>
            <Text style={styles.communityLabel}>{t('createPostTo')}</Text>
            {loadingCommunities ? (
              <ActivityIndicator color={ACTIVE_COLOR} size="small" />
            ) : communities.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityList}>
                {communities.map((community) => {
                  const selected = community.id === selectedCommunityId;
                  return (
                    <Pressable
                      key={community.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedCommunityId(community.id)}
                      style={[styles.communityButton, selected && styles.selectedCommunityButton]}
                    >
                      <Text numberOfLines={1} style={[styles.communityButtonText, selected && styles.selectedCommunityButtonText]}>{community.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.noCommunities}>{t('createJoinToPost')}</Text>
            )}
          </View>

          {subCommunities.length ? (
            <View style={styles.communitySection}>
              <Text style={styles.communityLabel}>{t('createCircleLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityList}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: !selectedSubCommunityId }}
                  onPress={() => setSelectedSubCommunityId('')}
                  style={[styles.communityButton, !selectedSubCommunityId && styles.selectedCommunityButton]}
                >
                  <Text style={[styles.communityButtonText, !selectedSubCommunityId && styles.selectedCommunityButtonText]}>{t('createMainFeed')}</Text>
                </Pressable>
                {subCommunities.map((sub) => {
                  const selected = String(sub.id) === selectedSubCommunityId;
                  return (
                    <Pressable
                      key={sub.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedSubCommunityId(String(sub.id))}
                      style={[styles.communityButton, selected && styles.selectedCommunityButton]}
                    >
                      <Text numberOfLines={1} style={[styles.communityButtonText, selected && styles.selectedCommunityButtonText]}>{sub.title}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <TextInput
            onChangeText={setTitle}
            placeholder={t('createTitlePlaceholder')}
            placeholderTextColor="#8B948D"
            returnKeyType="next"
            style={styles.input}
            value={title}
          />
          <TextInput
            multiline
            onChangeText={setDescription}
            placeholder={t('createDescriptionPlaceholder')}
            placeholderTextColor="#8B948D"
            style={[styles.input, styles.descriptionInput]}
            textAlignVertical="top"
            value={description}
          />
          {selectedPostType === 'event' ? (
            <View style={styles.dateRow}>
              <View style={styles.dateLabel}>
                <CalendarDays color="#647168" size={17} />
                <Text style={styles.dateLabelText}>{t('createEventDate')}</Text>
              </View>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  display="compact"
                  minimumDate={startOfToday()}
                  mode="date"
                  onChange={changeEventDate}
                  value={eventDate}
                />
              ) : (
                <Pressable onPress={() => setShowAndroidDatePicker(true)} style={styles.androidDateButton}>
                  <Text style={styles.androidDateText}>{eventDate.toLocaleDateString()}</Text>
                </Pressable>
              )}
              {Platform.OS === 'android' && showAndroidDatePicker ? (
                <DateTimePicker
                  minimumDate={startOfToday()}
                  mode="date"
                  onChange={changeEventDate}
                  value={eventDate}
                />
              ) : null}
            </View>
          ) : null}
          <SubmitButton disabled={submitting || loadingCommunities || !communities.length} loading={submitting} onPress={() => void submitPost()} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DCE5DA' },
  overlay: { flex: 1, paddingHorizontal: 12 },
  creatorCard: {
    width: '100%',
    padding: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: '#DCE3DC',
    gap: 9,
  },
  creatorHeading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heading: { color: '#26342B', fontSize: 22, fontWeight: '800' },
  postTypeWrapper: { flexDirection: 'row', gap: 7 },
  communitySection: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  communityLabel: { color: '#536057', fontSize: 12, fontWeight: '700' },
  communityList: { gap: 6, paddingRight: 4 },
  communityButton: { maxWidth: 150, minHeight: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: '#E8ECE8', alignItems: 'center', justifyContent: 'center' },
  selectedCommunityButton: { backgroundColor: ACTIVE_COLOR },
  communityButtonText: { color: '#536057', fontSize: 12, fontWeight: '600' },
  selectedCommunityButtonText: { color: '#FFFFFF' },
  noCommunities: { flex: 1, color: '#9A5656', fontSize: 12 },
  postTypeButton: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  postTypeButtonPressable: { paddingHorizontal: 7, paddingVertical: 9 },
  typeButtonText: { textAlign: 'center', fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5DDD5',
    backgroundColor: '#F8FAF8',
    color: '#26342B',
    fontSize: 14,
  },
  descriptionInput: { minHeight: 64, maxHeight: 100 },
  dateRow: { minHeight: 40, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#D5DDD5', backgroundColor: '#F8FAF8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dateLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateLabelText: { color: '#536057', fontSize: 13, fontWeight: '700' },
  androidDateButton: { minHeight: 34, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  androidDateText: { color: '#26342B', fontSize: 13, fontWeight: '600' },
  submitButton: { borderRadius: 10, overflow: 'hidden' },
  submitButtonPressable: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  submitButtonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  locationStatus: { minHeight: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: '#EBEFEB', flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationSelected: { backgroundColor: ACTIVE_COLOR },
  locationStatusText: { color: '#647168', fontSize: 11, fontWeight: '700' },
  locationSelectedText: { color: '#FFFFFF' },
  buttonPressed: { opacity: 0.78 },
});
