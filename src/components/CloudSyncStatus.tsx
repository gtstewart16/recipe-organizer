import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

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
    backgroundColor: '#fff7f0',
    borderColor: '#ead8c7',
    badgeBackgroundColor: '#efe1d3',
    badgeTextColor: '#7a563c',
    titleColor: '#241711',
    messageColor: '#5d4b3d',
    indicatorColor: '#a86238',
    badgeLabel: 'Syncing',
  },
  error: {
    backgroundColor: '#fff2ee',
    borderColor: '#f0c9bf',
    badgeBackgroundColor: '#fbe8e3',
    badgeTextColor: '#b33f2f',
    titleColor: '#6e291f',
    messageColor: '#7a4a41',
    indicatorColor: '#b33f2f',
    badgeLabel: 'Needs attention',
  },
  success: {
    backgroundColor: '#f3faf4',
    borderColor: '#d7e9d8',
    badgeBackgroundColor: '#e4f1e5',
    badgeTextColor: '#2f6f5d',
    titleColor: '#1f3f35',
    messageColor: '#4e645c',
    indicatorColor: '#2f6f5d',
    badgeLabel: 'Up to date',
  },
  info: {
    backgroundColor: '#f5f7fb',
    borderColor: '#dbe1ee',
    badgeBackgroundColor: '#e7ecf5',
    badgeTextColor: '#52607a',
    titleColor: '#233047',
    messageColor: '#51607b',
    indicatorColor: '#52607a',
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
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contentRow: {
    flex: 1,
  },
  contentRowInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeSpinner: {
    marginRight: 2,
  },
  badgeDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
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
