import { StyleSheet, Text, View } from 'react-native';

import type { ImportJob } from '../../store/recipe-book';
import { InteractivePressable } from '../InteractivePressable';

export type ImportHistorySectionProps = {
  failed: ImportJob[];
  inReview: ImportJob[];
  saved: ImportJob[];
  onRetry: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onOpenRecipe: (recipeId: string) => void;
};

export function ImportHistorySection({
  failed,
  inReview,
  saved,
  onRetry,
  onResume,
  onOpenRecipe,
}: ImportHistorySectionProps) {
  const hasAnyJobs = failed.length > 0 || inReview.length > 0 || saved.length > 0;

  return (
    <View style={styles.section} testID="import-history-section">
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Import history</Text>
        <Text style={styles.body}>
          Keep track of the latest link and photo imports so you can retry a miss, finish a draft, or open a saved
          recipe later.
        </Text>
      </View>

      {hasAnyJobs ? (
        <View style={styles.groups}>
          {failed.length > 0 ? (
            <HistoryGroup
              accent="warn"
              jobs={failed}
              title="Needs attention"
            >
              {(job) => (
                <HistoryJobCard
                  job={job}
                  actionLabel="Retry"
                  actionTone="warn"
                  detail={job.errorMessage ?? 'This import needs another look before it can be saved.'}
                  onAction={() => onRetry(job.id)}
                />
              )}
            </HistoryGroup>
          ) : null}

          {inReview.length > 0 ? (
            <HistoryGroup accent="calm" jobs={inReview} title="In review">
              {(job) => (
                <HistoryJobCard
                  job={job}
                  actionLabel="Resume review"
                  actionTone="calm"
                  detail={job.draft?.title ?? 'A draft is ready to pick back up and finish.'}
                  onAction={() => onResume(job.id)}
                />
              )}
            </HistoryGroup>
          ) : null}

          {saved.length > 0 ? (
            <HistoryGroup accent="success" jobs={saved} title="Recently saved">
              {(job) => (
                <HistoryJobCard
                  job={job}
                  actionLabel="Open recipe"
                  actionTone="success"
                  detail="Saved to your shared library."
                  onAction={() => {
                    if (job.recipeId) {
                      onOpenRecipe(job.recipeId);
                    }
                  }}
                />
              )}
            </HistoryGroup>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No import history yet</Text>
          <Text style={styles.emptyBody}>
            New imports will appear here after you create a draft, save a recipe, or revisit a failed attempt.
          </Text>
        </View>
      )}
    </View>
  );
}

type HistoryGroupProps = {
  title: string;
  accent: 'warn' | 'calm' | 'success';
  jobs: ImportJob[];
  children: (job: ImportJob) => React.ReactNode;
};

function HistoryGroup({ title, accent, jobs, children }: HistoryGroupProps) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={[styles.groupTitle, accentStyles[accent].title]}>{title}</Text>
        <Text style={[styles.groupCount, accentStyles[accent].count]}>{jobs.length}</Text>
      </View>
      <View style={styles.jobList}>
        {jobs.map((job) => (
          <View key={job.id}>{children(job)}</View>
        ))}
      </View>
    </View>
  );
}

type HistoryJobCardProps = {
  job: ImportJob;
  detail: string;
  actionLabel: string;
  actionTone: 'warn' | 'calm' | 'success';
  onAction: () => void;
};

function HistoryJobCard({ job, detail, actionLabel, actionTone, onAction }: HistoryJobCardProps) {
  return (
    <View style={[styles.card, accentStyles[actionTone].card]}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {job.title}
        </Text>
        <Text style={styles.cardDetail}>{detail}</Text>
      </View>

      <InteractivePressable style={[styles.cardButton, accentStyles[actionTone].button]} onPress={onAction}>
        <Text style={[styles.cardButtonLabel, accentStyles[actionTone].buttonLabel]}>{actionLabel}</Text>
      </InteractivePressable>
    </View>
  );
}

const accentStyles = {
  warn: {
    title: { color: '#8f4e33' },
    count: { color: '#a86238' },
    card: { backgroundColor: '#fff6f2', borderColor: '#e8c9bc' },
    button: { backgroundColor: '#a86238' },
    buttonLabel: { color: '#fff7f2' },
  },
  calm: {
    title: { color: '#4e6c57' },
    count: { color: '#2f6f5d' },
    card: { backgroundColor: '#f3faf4', borderColor: '#d7e9d8' },
    button: { backgroundColor: '#2f6f5d' },
    buttonLabel: { color: '#f7fff9' },
  },
  success: {
    title: { color: '#6b5c3d' },
    count: { color: '#8e744d' },
    card: { backgroundColor: '#fffaf0', borderColor: '#eadfca' },
    button: { backgroundColor: '#8e744d' },
    buttonLabel: { color: '#fffaf0' },
  },
} as const;

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  headerCopy: {
    gap: 8,
  },
  title: {
    color: '#241711',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  body: {
    color: '#5d4b3d',
    fontSize: 15,
    lineHeight: 22,
  },
  groups: {
    gap: 12,
  },
  group: {
    gap: 10,
  },
  groupHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  jobList: {
    gap: 10,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardCopy: {
    gap: 6,
  },
  cardTitle: {
    color: '#241711',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardDetail: {
    color: '#5d4b3d',
    fontSize: 14,
    lineHeight: 20,
  },
  cardButton: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#fffaf5',
    borderColor: '#e6d5c5',
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  emptyTitle: {
    color: '#241711',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: '#5d4b3d',
    fontSize: 14,
    lineHeight: 20,
  },
});
