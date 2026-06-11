import { StyleSheet, Text, View } from 'react-native';

import type { PendingSharedImport } from '../features/shared-imports/types';
import { colors, radius, shadows, spacing, type } from '../theme';
import { InteractivePressable } from './InteractivePressable';

export type SharedImportQueueProps = {
  items: PendingSharedImport[];
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
};

export function SharedImportQueue({ items, onOpen, onRetry, onDismiss }: SharedImportQueueProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View testID="shared-import-queue" style={styles.panel}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Import inbox</Text>
        <Text style={styles.subtitle}>Recipes shared from Safari and other apps wait here until you review them.</Text>
      </View>
      <View style={styles.rows}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={[styles.statusLabel, { color: formatStatusColor(item.status) }]}>
                {formatStatus(item.status)}
              </Text>
              <Text style={styles.sourceKind}>{item.sourceKind === 'url' ? 'Link' : 'Text'}</Text>
            </View>
            <Text style={styles.rowTitle}>{item.draft?.title ?? item.sourceLabel ?? 'Shared recipe import'}</Text>
            <Text style={styles.sourceHint}>{formatSourceHint(item)}</Text>
            {item.errorMessage ? <Text style={styles.errorText}>{item.errorMessage}</Text> : null}
            <View style={styles.actions}>
              {item.status === 'ready' && item.draft ? (
                <InteractivePressable style={styles.primaryAction} onPress={() => onOpen(item.id)}>
                  <Text style={styles.primaryActionLabel}>Review recipe</Text>
                </InteractivePressable>
              ) : null}
              {item.status === 'duplicate' && item.recipeId ? (
                <InteractivePressable style={styles.primaryAction} onPress={() => onOpen(item.id)}>
                  <Text style={styles.primaryActionLabel}>Open recipe</Text>
                </InteractivePressable>
              ) : null}
              {item.status === 'failed' ? (
                <InteractivePressable style={styles.secondaryAction} onPress={() => onRetry(item.id)}>
                  <Text style={styles.secondaryActionLabel}>Try again</Text>
                </InteractivePressable>
              ) : null}
              <InteractivePressable style={styles.secondaryAction} onPress={() => onDismiss(item.id)}>
                <Text style={styles.secondaryActionLabel}>Dismiss</Text>
              </InteractivePressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatStatus(status: PendingSharedImport['status']) {
  if (status === 'ready') {
    return 'Ready to review';
  }

  if (status === 'duplicate') {
    return 'Already saved';
  }

  if (status === 'pending' || status === 'processing') {
    return 'Processing';
  }

  return 'Needs attention';
}

function formatStatusColor(status: PendingSharedImport['status']) {
  if (status === 'ready' || status === 'duplicate') {
    return colors.success;
  }

  if (status === 'pending' || status === 'processing') {
    return colors.textMuted;
  }

  return colors.danger;
}

function formatSourceHint(item: PendingSharedImport) {
  if (item.sourceKind === 'url' && 'url' in item.payload) {
    return item.payload.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  if ('text' in item.payload) {
    return item.payload.text.replace(/\s+/g, ' ').trim().slice(0, 96);
  }

  return item.sourceLabel ?? 'Shared recipe';
}

const styles = StyleSheet.create({
  panel: {
    ...shadows.card,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    ...type.sectionTitle,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
  },
  sectionHeader: {
    gap: spacing.xxs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  statusLabel: {
    ...type.eyebrow,
  },
  sourceKind: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rowTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  sourceHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  primaryAction: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryActionLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryAction: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryActionLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
});
