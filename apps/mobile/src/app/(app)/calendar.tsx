import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Map as MapIcon } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { getJoinedCommunityIds } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, type TranslationKey } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

type CalendarEventRow = {
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

const WEEKDAY_KEYS: TranslationKey[] = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];
const MONTH_KEYS: TranslationKey[] = [
  'monthJanuary', 'monthFebruary', 'monthMarch', 'monthApril', 'monthMay', 'monthJune',
  'monthJuly', 'monthAugust', 'monthSeptember', 'monthOctober', 'monthNovember', 'monthDecember',
];

function parseEventDate(value: string | null): { day: number; month: number; year: number } | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  return { year, month: month - 1, day };
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasJoinedCommunities, setHasJoinedCommunities] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!viewerId) {
      setLoading(false);
      return;
    }

    setError('');
    try {
      const joinedCommunityIds = await getJoinedCommunityIds(viewerId);
      if (!joinedCommunityIds.length) {
        setHasJoinedCommunities(false);
        setEvents([]);
        setLoading(false);
        return;
      }

      setHasJoinedCommunities(true);
      const { data, error: postsError } = await supabase
        .rpc('get_visible_posts', { community_ids: joinedCommunityIds, post_types: ['event'] });

      if (postsError) throw postsError;
      const sortedEvents = ((data ?? []) as CalendarEventRow[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setEvents(sortedEvents);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('calendarLoadFailed'));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [viewerId]);

  useFocusEffect(useCallback(() => {
    void loadEvents();
  }, [loadEvents]));

  function changeMonth(offset: number) {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(null);
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEventRow[]>();
    events.forEach((event) => {
      const parsed = parseEventDate(event.date);
      if (!parsed || parsed.year !== viewYear || parsed.month !== viewMonth) return;
      const existing = map.get(parsed.day) ?? [];
      existing.push(event);
      map.set(parsed.day, existing);
    });
    return map;
  }, [events, viewYear, viewMonth]);

  const dayCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    return cells;
  }, [viewYear, viewMonth]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const dailyEvents = selectedDay != null ? eventsByDay.get(selectedDay) ?? [] : [];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabCalendar')}</Text>
        <Pressable accessibilityLabel={t('calendarOpenMap')} hitSlop={10} onPress={() => router.push('/map')} style={styles.iconButton}>
          <MapIcon color={colors.textSecondary} size={21} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>{t('calendarLoading')}</Text>
        </View>
      ) : !hasJoinedCommunities ? (
        <View style={styles.content}>
          <EmptyState Icon={CalendarDays} helpText={t('calendarNoCommunitiesHelp')} title={t('calendarNoCommunitiesTitle')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.monthNav}>
            <Pressable accessibilityLabel={t('calendarPreviousMonth')} hitSlop={10} onPress={() => changeMonth(-1)} style={styles.iconButton}>
              <ChevronLeft color={colors.textPrimary} size={22} />
            </Pressable>
            <Text style={styles.monthLabel}>{t(MONTH_KEYS[viewMonth])} {viewYear}</Text>
            <Pressable accessibilityLabel={t('calendarNextMonth')} hitSlop={10} onPress={() => changeMonth(1)} style={styles.iconButton}>
              <ChevronRight color={colors.textPrimary} size={22} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_KEYS.map((key) => (
              <Text key={key} style={styles.weekdayLabel}>{t(key)}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {dayCells.map((day, index) => {
              if (day == null) return <View key={`empty-${index}`} style={styles.dayCell} />;
              const isToday = isCurrentMonth && day === today.getDate();
              const isSelected = selectedDay === day;
              const hasEvent = eventsByDay.has(day);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[styles.dayCell, isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]}
                >
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{day}</Text>
                  {hasEvent ? <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} /> : null}
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.eventsSection}>
            <Text style={styles.eventsSectionTitle}>
              {selectedDay != null ? `${t(MONTH_KEYS[viewMonth])} ${selectedDay}` : t('calendarSelectDay')}
            </Text>
            {selectedDay == null ? (
              <Text style={styles.muted}>{t('calendarTapDayHint')}</Text>
            ) : dailyEvents.length === 0 ? (
              <Text style={styles.muted}>{t('calendarNoEventsForDay')}</Text>
            ) : (
              <View style={styles.eventList}>
                {dailyEvents.map((event) => (
                  <Pressable key={event.id} onPress={() => router.push(`/post/${event.id}`)} style={styles.eventCard}>
                    <Text numberOfLines={1} style={styles.eventTitle}>{event.title || t('headerPost')}</Text>
                    {event.location ? (
                      <View style={styles.eventLocationRow}>
                        <MapPin color={colors.textFaint} size={14} />
                        <Text numberOfLines={1} style={styles.eventLocation}>{event.location}</Text>
                      </View>
                    ) : null}
                    {event.body ? <Text numberOfLines={2} style={styles.eventBody}>{event.body}</Text> : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { padding: 14, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, minHeight: 260, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
  content: { padding: 14, gap: 14, flexGrow: 1 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 10,
  },
  dayCellToday: { backgroundColor: colors.primarySoft },
  dayCellSelected: { backgroundColor: colors.primary },
  dayNumber: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  dayNumberSelected: { color: colors.textOnPrimary, fontWeight: '800' },
  eventDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primaryDark },
  eventDotSelected: { backgroundColor: colors.textOnPrimary },
  errorText: { color: colors.dangerText, backgroundColor: colors.dangerBackground, padding: 9, borderRadius: 9, fontSize: 12 },
  eventsSection: { gap: 8 },
  eventsSectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  eventList: { gap: 10 },
  eventCard: { padding: 13, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, gap: 5 },
  eventTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventLocation: { flex: 1, color: colors.textFaint, fontSize: 12 },
  eventBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
