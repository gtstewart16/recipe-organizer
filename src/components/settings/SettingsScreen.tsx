import { StyleSheet, Text, View } from 'react-native';

import { InteractivePressable } from '../InteractivePressable';
import { colors, radius, shadows, spacing, type } from '../../theme';

export type SettingsScreenProps = {
  onClose: () => void;
  onSignOut: () => void;
};

export function SettingsScreen({ onClose, onSignOut }: SettingsScreenProps) {
  return (
    <View style={styles.screen} testID="settings-screen">
      <View style={styles.chrome}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Kitchen Shelf</Text>
            <Text style={styles.title}>Settings</Text>
          </View>

          <InteractivePressable
            accessibilityLabel="Close settings"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonLabel}>×</Text>
          </InteractivePressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>Account</Text>
              <Text style={styles.cardTitle}>Session</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillLabel}>Signed in</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardDescription}>Manage your session and leave the app when you&apos;re finished.</Text>

          <InteractivePressable
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            onPress={onSignOut}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutButtonLabel}>Sign out</Text>
          </InteractivePressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingTop: spacing.xxl + spacing.xl,
  },
  chrome: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  eyebrow: {
    color: colors.accent,
    ...type.eyebrow,
  },
  title: {
    color: colors.text,
    ...type.title,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.card,
  },
  closeButtonLabel: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
    marginTop: -2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.accent,
    ...type.eyebrow,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: spacing.xxs,
  },
  statusPill: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(47, 111, 93, 0.18)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPillLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  signOutButtonLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});
