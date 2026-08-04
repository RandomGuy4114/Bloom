import { ArrowLeft } from 'lucide-react-native';
import { type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemePalette } from '@/theme/colors';

type ScreenHeaderProps = {
  onBack?: () => void;
  right?: ReactNode;
  showBack?: boolean;
  title: string;
};

export default function ScreenHeader({ onBack, right, showBack = true, title }: ScreenHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          accessibilityLabel={t('back')}
          hitSlop={10}
          onPress={onBack ?? (() => router.back())}
          style={styles.iconButton}
        >
          <ArrowLeft color={colors.textPrimary} size={24} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <View style={styles.rightSlot}>{right ?? <View style={styles.iconButton} />}</View>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  header: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  rightSlot: { minWidth: 40, alignItems: 'flex-end' },
});
