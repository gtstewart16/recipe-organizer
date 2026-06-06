import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

export type CloudSyncStatusState = 'loading' | 'error' | 'success' | 'info';

export type CloudSyncStatusProps = {
  state: CloudSyncStatusState;
  title: string;
  message: string;
};

type StatusTheme = {
  backgroundColor: string;
  borderColor: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  titleColor: string;
  messageColor: string;
  indicatorColor: string;
  badgeLabel: string;
};

const STATUS_THEMES: Record<CloudSyncStatusState, StatusTheme> = {
  loading: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    badgeBackgroundColor: colors.accentSoft,
    badgeTextColor: colors.accentPressed,
    titleColor: colors.text,
    messageColor: colors.textMuted,
    indicatorColor: colors.accent,
    badgeLabel: 'Syncing',
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.borderStrong,
    badgeBackgroundColor: colors.surface,
    badgeTextColor: colors.danger,
    titleColor: colors.danger,
    messageColor: colors.textMuted,
    indicatorColor: colors.danger,
    badgeLabel: 'Needs attention',
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.border,
    badgeBackgroundColor: colors.surface,
    badgeTextColor: colors.success,
    titleColor: colors.success,
    messageColor: colors.textMuted,
    indicatorColor: colors.success,
    badgeLabel: 'Up to date',
  },
  info: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    badgeBackgroundColor: colors.surface,
    badgeTextColor: colors.textMuted,
    titleColor: colors.text,
    messageColor: colors.textMuted,
    indicatorColor: colors.textSubtle,
    badgeLabel: 'Shared library',
  },
};

export function CloudSyncStatus({ state, title, message }: CloudSyncStatusProps) {
  const theme = STATUS_THEMES[state];

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor }]}
      testID="cloud-sync-status-root"
    >
      <View style={[styles.contentRow, styles.contentRowInner]}>
        <View style={[styles.badge, { backgroundColor: theme.badgeBackgroundColor }]} testID="cloud-sync-status-badge">
          {state === 'loading' ? (
            <ActivityIndicator
              color={theme.indicatorColor}
              size="small"
              style={styles.badgeSpinner}
              testID="cloud-sync-status-indicator"
            />
          ) : (
            <View style={[styles.badgeDot, { backgroundColor: theme.indicatorColor }]} />
          )}
          <Text style={[styles.badgeLabel, { color: theme.badgeTextColor }]}>{theme.badgeLabel}</Text>
        </View>

        <View style={styles.copyColumn}>
          <Text style={styles.inlineCopy} numberOfLines={1} ellipsizeMode="tail">
            <Text style={[styles.titleText, { color: theme.titleColor }]}>{title}</Text>
            <Text style={[styles.messageText, { color: theme.messageColor }]}> {message}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  contentRow: {
    flex: 1,
  },
  contentRowInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  badgeSpinner: {
    marginRight: 2,
  },
  badgeDot: {
    borderRadius: radius.pill,
    height: spacing.xs,
    width: spacing.xs,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  copyColumn: {
    flex: 1,
  },
  inlineCopy: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  titleText: {
    fontWeight: '700',
  },
  messageText: {
    fontWeight: '500',
  },
});
