import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { InteractivePressable } from './InteractivePressable';

export type ImportFeedbackTone = 'error' | 'info';

export type ImportFeedbackAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export type ImportFeedbackCardProps = {
  title: string;
  message: string;
  tone?: ImportFeedbackTone;
  guidance?: string[];
  primaryAction?: ImportFeedbackAction;
  secondaryAction?: ImportFeedbackAction;
  testID?: string;
};

export function ImportFeedbackCard({
  title,
  message,
  tone = 'error',
  guidance = [],
  primaryAction,
  secondaryAction,
  testID = 'import-feedback-card',
}: ImportFeedbackCardProps) {
  const palette = tone === 'error' ? errorPalette : infoPalette;

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[styles.card, { backgroundColor: palette.background, borderColor: palette.border }]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.badgeLabel, { color: palette.badgeText }]}>
            {tone === 'error' ? 'Import issue' : 'Import note'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {guidance.length > 0 ? (
        <View style={styles.guidanceList}>
          {guidance.map((item, index) => (
            <Text key={`${item}-${index}`} style={styles.guidanceItem}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      {primaryAction || secondaryAction ? (
        <View style={styles.actionsRow}>
          {secondaryAction ? (
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
              style={[styles.secondaryButton, { borderColor: palette.buttonBorder }]}
              onPress={secondaryAction.onPress}
            >
              <Text style={[styles.secondaryButtonLabel, { color: palette.buttonText }]}>{secondaryAction.label}</Text>
            </InteractivePressable>
          ) : null}
          {primaryAction ? (
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
              style={[styles.primaryButton, { backgroundColor: palette.buttonBackground }]}
              onPress={primaryAction.onPress}
            >
              <Text style={styles.primaryButtonLabel}>{primaryAction.label}</Text>
            </InteractivePressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type Palette = {
  background: string;
  border: string;
  badgeBackground: string;
  badgeText: string;
  buttonBackground: string;
  buttonBorder: string;
  buttonText: string;
};

const errorPalette: Palette = {
  background: colors.dangerSoft,
  border: colors.borderStrong,
  badgeBackground: colors.surface,
  badgeText: colors.danger,
  buttonBackground: colors.accent,
  buttonBorder: colors.borderStrong,
  buttonText: colors.accentPressed,
};

const infoPalette: Palette = {
  background: colors.successSoft,
  border: colors.border,
  badgeBackground: colors.surface,
  badgeText: colors.success,
  buttonBackground: colors.success,
  buttonBorder: colors.borderStrong,
  buttonText: colors.success,
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: 18,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  message: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  guidanceList: {
    gap: spacing.xs,
  },
  guidanceItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.xxs,
  },
  primaryButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
