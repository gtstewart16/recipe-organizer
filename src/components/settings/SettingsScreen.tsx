import { StyleSheet, Text, View } from 'react-native';

import { InteractivePressable } from '../InteractivePressable';

export type SettingsScreenProps = {
  onClose: () => void;
  onSignOut: () => void;
};

export function SettingsScreen({ onClose, onSignOut }: SettingsScreenProps) {
  return (
    <View style={styles.screen} testID="settings-screen">
      <View style={styles.chrome}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>

          <InteractivePressable
            accessibilityLabel="Close settings"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonLabel}>×</Text>
          </InteractivePressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Account</Text>
          <Text style={styles.cardDescription}>
            Manage your session and leave the app when you&apos;re finished.
          </Text>

          <InteractivePressable
            accessibilityLabel="Sign out"
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
    backgroundColor: '#f7f1ea',
    flex: 1,
    paddingTop: 56,
  },
  chrome: {
    gap: 18,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#241711',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 40,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#fff7ef',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeButtonLabel: {
    color: '#241711',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
    marginTop: -2,
  },
  card: {
    backgroundColor: '#fff7ef',
    borderColor: '#eadfd3',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  cardLabel: {
    color: '#8a5b3f',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardDescription: {
    color: '#5d4b3d',
    fontSize: 15,
    lineHeight: 22,
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#241711',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  signOutButtonLabel: {
    color: '#fff7ef',
    fontSize: 16,
    fontWeight: '700',
  },
});
