import { useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: ButtonVariant;
};

export default function Button({ disabled, label, loading, onPress, variant = 'primary' }: ButtonProps) {
  const { colors } = useTheme();
  const pressedProgress = useRef(new Animated.Value(0)).current;

  const backgroundByVariant: Record<ButtonVariant, [string, string]> = useMemo(() => ({
    primary: [colors.primary, colors.primaryPressed],
    secondary: [colors.chipInactive, colors.borderStrong],
    danger: [colors.dangerBackground, '#F5D5D5'],
  }), [colors]);

  const textColorByVariant: Record<ButtonVariant, string> = useMemo(() => ({
    primary: colors.textOnPrimary,
    secondary: colors.textSecondary,
    danger: colors.dangerText,
  }), [colors]);

  const [restColor, pressedColor] = backgroundByVariant[variant];
  const backgroundColor = pressedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [restColor, pressedColor],
  });

  function animate(toValue: number) {
    Animated.timing(pressedProgress, { toValue, duration: 140, useNativeDriver: false }).start();
  }

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[styles.button, { backgroundColor }, isDisabled && styles.disabled]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        style={styles.pressable}
      >
        {loading ? (
          <ActivityIndicator color={textColorByVariant[variant]} />
        ) : (
          <Text style={[styles.label, { color: textColorByVariant[variant] }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, overflow: 'hidden' },
  pressable: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  label: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
