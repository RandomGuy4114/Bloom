import { CalendarDays, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect, useRouter } from 'expo-router';

import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { getJoinedCommunityIds } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

type MapEventRow = {
  body: string | null;
  community: string | null;
  created_at: string | null;
  date: string | null;
  id: string;
  img_link: string | null;
  img_links: string[] | null;
  location: string | null;
  post_type: string | null;
  title: string | null;
};

type MapEvent = MapEventRow & {
  communityName: string | null;
  coordinate: { latitude: number; longitude: number };
};

const INITIAL_REGION = {
  latitude: -25.2867,
  longitude: -57.3333,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function parseEventLocation(value: string | null): { latitude: number; longitude: number } | null {
  if (!value) return null;

  let latitude: number | undefined;
  let longitude: number | undefined;

  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length === 2 && parts.every((part) => Number.isFinite(part))) {
    [latitude, longitude] = parts;
  } else {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed) && parsed.length === 2) {
        latitude = Number(parsed[0]);
        longitude = Number(parsed[1]);
      } else if (parsed && typeof parsed === 'object') {
        const candidate = parsed as { latitude?: unknown; longitude?: unknown };
        latitude = Number(candidate.latitude);
        longitude = Number(candidate.longitude);
      }
    } catch {
      return null;
    }
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180) return null;
  return { latitude: latitude!, longitude: longitude! };
}

function formatEventDate(value: string | null) {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString();
}

export default function MapScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!viewerId) {
      setLoading(false);
      return;
    }

    setError('');
    try {
      const joinedCommunityIds = await getJoinedCommunityIds(viewerId);
      if (!joinedCommunityIds.length) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data: unorderedData, error: postsError } = await supabase
        .rpc('get_visible_posts', { community_ids: joinedCommunityIds, post_types: ['event'] });

      if (postsError) throw postsError;
      const data = (unorderedData ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const rows = (data ?? []) as MapEventRow[];
      const communityIds = [...new Set(rows.map((row) => row.community).filter((id): id is string => Boolean(id)))];
      const { data: communities, error: communitiesError } = communityIds.length
        ? await supabase.from('Communities').select('id, name').in('id', communityIds)
        : { data: [] as { id: string; name: string }[], error: null };

      if (communitiesError) throw communitiesError;

      const communityNames = new Map((communities ?? []).map((community) => [String(community.id), community.name]));

      const withLocation: MapEvent[] = [];
      rows.forEach((row) => {
        const coordinate = parseEventLocation(row.location);
        if (!coordinate) return;
        withLocation.push({
          ...row,
          coordinate,
          communityName: row.community ? communityNames.get(row.community) ?? null : null,
        });
      });

      setEvents(withLocation);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('mapLoadFailed'));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [viewerId]);

  useFocusEffect(useCallback(() => {
    void loadEvents();
  }, [loadEvents]));

  const initialRegion = useMemo(() => {
    if (!events.length) return INITIAL_REGION;
    const avgLatitude = events.reduce((sum, event) => sum + event.coordinate.latitude, 0) / events.length;
    const avgLongitude = events.reduce((sum, event) => sum + event.coordinate.longitude, 0) / events.length;
    return { latitude: avgLatitude, longitude: avgLongitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }, [events]);

  const selectedEvent = selectedPostId ? events.find((event) => event.id === selectedPostId) ?? null : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('headerMap')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>{t('mapLoadingEvents')}</Text>
        </View>
      ) : (
        <View style={styles.mapWrapper}>
          <MapView
            initialRegion={initialRegion}
            pitchEnabled={false}
            rotateEnabled={false}
            style={StyleSheet.absoluteFill}
          >
            {events.map((event) => (
              <Marker
                coordinate={event.coordinate}
                key={event.id}
                onPress={() => setSelectedPostId(event.id)}
                pinColor={colors.primary}
                title={event.title || t('headerPost')}
              />
            ))}
          </MapView>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!events.length && !error ? (
            <View style={styles.emptyBanner}>
              <CalendarDays color={colors.textFaint} size={18} />
              <Text style={styles.emptyText}>{t('mapEmptyHelp')}</Text>
            </View>
          ) : null}

          {selectedEvent ? (
            <View style={styles.summaryCard}>
              <Pressable
                accessibilityLabel={t('mapDismiss')}
                hitSlop={10}
                onPress={() => setSelectedPostId(null)}
                style={styles.dismissButton}
              >
                <X color={colors.textFaint} size={18} />
              </Pressable>
              <Text numberOfLines={1} style={styles.summaryTitle}>{selectedEvent.title || t('headerPost')}</Text>
              <View style={styles.summaryMetaRow}>
                {formatEventDate(selectedEvent.date) ? (
                  <View style={styles.summaryMeta}>
                    <CalendarDays color={colors.textFaint} size={14} />
                    <Text style={styles.summaryMetaText}>{formatEventDate(selectedEvent.date)}</Text>
                  </View>
                ) : null}
                {selectedEvent.communityName ? (
                  <Text numberOfLines={1} style={styles.summaryCommunity}>{t('mapInCommunity', { name: selectedEvent.communityName })}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => router.push(`/post/${selectedEvent.id}`)} style={styles.viewButton}>
                <Text style={styles.viewButtonText}>{t('mapViewEvent')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  mapWrapper: { flex: 1 },
  center: { flex: 1, minHeight: 260, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
  errorBanner: { position: 'absolute', top: 12, left: 12, right: 12, padding: 11, borderRadius: 11, backgroundColor: colors.dangerBackground },
  errorText: { color: colors.dangerText, fontSize: 12 },
  emptyBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { flex: 1, color: colors.textFaint, fontSize: 12, lineHeight: 17 },
  summaryCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 8,
  },
  dismissButton: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { paddingRight: 26, color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  summaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryMetaText: { color: colors.textFaint, fontSize: 12 },
  summaryCommunity: { flex: 1, color: colors.textFaint, fontSize: 12 },
  viewButton: { minHeight: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  viewButtonText: { color: colors.textOnPrimary, fontSize: 14, fontWeight: '700' },
});
