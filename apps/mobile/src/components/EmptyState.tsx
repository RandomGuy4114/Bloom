import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { ThemePalette } from '@/theme/colors';

type EmptyStateProps = {
  helpText?: string;
  Icon?: LucideIcon;
  title: string;
};

export default function EmptyState({ helpText, Icon, title }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      {Icon ? <Icon color={colors.textFaint} size={34} /> : null}
      <Text style={styles.title}>{title}</Text>
      {helpText ? <Text style={styles.helpText}>{helpText}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  card: {
    minHeight: 200,
    padding: 28,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: { color: colors.textSecondary, fontSize: 17, fontWeight: '700' },
  helpText: { color: colors.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
