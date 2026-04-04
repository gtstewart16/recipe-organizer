import { Pressable, StyleSheet, Text, View } from 'react-native';

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
              style={[styles.secondaryButton, { borderColor: palette.buttonBorder }]}
              onPress={secondaryAction.onPress}
            >
              <Text style={[styles.secondaryButtonLabel, { color: palette.buttonText }]}>{secondaryAction.label}</Text>
            </Pressable>
          ) : null}
          {primaryAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
              style={[styles.primaryButton, { backgroundColor: palette.buttonBackground }]}
              onPress={primaryAction.onPress}
            >
              <Text style={styles.primaryButtonLabel}>{primaryAction.label}</Text>
            </Pressable>
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
  background: '#fff6f2',
  border: '#e8c9bc',
  badgeBackground: '#f6dfd7',
  badgeText: '#8f4e33',
  buttonBackground: '#a86238',
  buttonBorder: '#d9b49d',
  buttonText: '#6e4b34',
};

const infoPalette: Palette = {
  background: '#f3f7f2',
  border: '#d7e3d8',
  badgeBackground: '#dfeadf',
  badgeText: '#4e6c57',
  buttonBackground: '#2f6f5d',
  buttonBorder: '#bcd0bf',
  buttonText: '#2d5849',
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#241711',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  message: {
    color: '#5d4b3d',
    fontSize: 15,
    lineHeight: 22,
  },
  guidanceList: {
    gap: 8,
  },
  guidanceItem: {
    color: '#6d5647',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    color: '#fff7f2',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
