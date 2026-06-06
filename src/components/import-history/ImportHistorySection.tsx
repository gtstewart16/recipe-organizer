import { StyleSheet, Text, View } from 'react-native';

import type { ImportJob, selectImportHistory } from '../../store/recipe-book';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { InteractivePressable } from '../InteractivePressable';

export type ImportHistory = ReturnType<typeof selectImportHistory>;

export type ImportHistorySectionProps = {
  history: ImportHistory;
  onRetryImport: (job: ImportJob) => void;
  onResumeReview: (job: ImportJob) => void;
  onOpenRecipe: (job: ImportJob) => void;
};

export function ImportHistorySection({
  history,
  onRetryImport,
  onResumeReview,
  onOpenRecipe,
}: ImportHistorySectionProps) {
  const isEmpty =
    history.failed.length === 0 && history.inReview.length === 0 && history.saved.length === 0;

  return (
    <View testID="import-history-section" style={styles.panel}>
      <Text style={styles.title}>Import history</Text>
      {isEmpty ? <Text style={styles.emptyText}>No import history yet</Text> : null}

      {history.failed.length > 0 ? (
        <HistoryGroup title="Needs attention">
          {history.failed.map((job) => (
            <HistoryRow key={job.id} job={job}>
              {job.errorMessage ? <Text style={styles.errorText}>{job.errorMessage}</Text> : null}
              {isRetryable(job) ? (
                <InteractivePressable
                  testID={`import-history-retry-${job.id}`}
                  style={styles.primaryAction}
                  onPress={() => onRetryImport(job)}
                >
                  <Text style={styles.primaryActionLabel}>Retry</Text>
                </InteractivePressable>
              ) : (
                <Text style={styles.unavailableAction}>Cannot retry</Text>
              )}
            </HistoryRow>
          ))}
        </HistoryGroup>
      ) : null}

      {history.inReview.length > 0 ? (
        <HistoryGroup title="In review">
          {history.inReview.map((job) => (
            <HistoryRow key={job.id} job={job}>
              <InteractivePressable
                testID={`import-history-resume-${job.id}`}
                style={styles.secondaryAction}
                onPress={() => onResumeReview(job)}
              >
                <Text style={styles.secondaryActionLabel}>Resume review</Text>
              </InteractivePressable>
            </HistoryRow>
          ))}
        </HistoryGroup>
      ) : null}

      {history.saved.length > 0 ? (
        <HistoryGroup title="Recently saved">
          {history.saved.map((job) => (
            <HistoryRow key={job.id} job={job}>
              {job.recipeId ? (
                <InteractivePressable
                  testID={`import-history-open-${job.id}`}
                  style={styles.secondaryAction}
                  onPress={() => onOpenRecipe(job)}
                >
                  <Text style={styles.secondaryActionLabel}>Open recipe</Text>
                </InteractivePressable>
              ) : null}
            </HistoryRow>
          ))}
        </HistoryGroup>
      ) : null}
    </View>
  );
}

function HistoryGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function HistoryRow({ job, children }: { job: ImportJob; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.sourceLabel}>{job.sourceType === 'url' ? 'Link import' : 'Photo import'}</Text>
        <Text style={styles.updatedText}>{formatUpdatedAt(job.updatedAt)}</Text>
      </View>
      <Text style={styles.rowTitle}>{job.title.trim() || 'Imported recipe'}</Text>
      <Text style={styles.sourceHint}>{formatSourceHint(job)}</Text>
      <View style={styles.rowActions}>{children}</View>
    </View>
  );
}

function isRetryable(job: ImportJob) {
  if (job.sourceType === 'url') {
    return Boolean(job.sourceUrl?.trim());
  }

  return false;
}

function formatSourceHint(job: ImportJob) {
  if (job.sourceType === 'url' && job.sourceUrl) {
    return job.sourceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  const count = job.sourcePhotoUris.length;
  if (count === 1) {
    return '1 photo';
  }

  if (count > 1) {
    return `${count} photos`;
  }

  return 'No source available';
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  group: {
    gap: spacing.xs,
  },
  groupTitle: {
    ...type.eyebrow,
    color: colors.accent,
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sourceLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  updatedText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
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
  rowActions: {
    alignItems: 'flex-start',
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
  unavailableAction: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: '700',
  },
});
