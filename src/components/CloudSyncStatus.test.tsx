import { fireEvent, render, screen } from '@testing-library/react-native';

import { CloudSyncStatus } from './CloudSyncStatus';
import { colors } from '../theme';

describe('CloudSyncStatus', () => {
  it('shows a loading state with an activity indicator and compact copy', () => {
    render(<CloudSyncStatus state="loading" title="Syncing your library" message="Checking Supabase for updates." />);

    expect(screen.getByText('Syncing your library')).toBeTruthy();
    expect(screen.getByText('Checking Supabase for updates.')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-status-indicator')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-status-root')).toHaveStyle({
      flexDirection: 'row',
      alignItems: 'center',
    });
  });

  it('renders an error state with the provided message', () => {
    render(<CloudSyncStatus state="error" title="Sync paused" message="We could not reach the shared library." />);

    expect(screen.getByText('Sync paused')).toBeTruthy();
    expect(screen.getByText('We could not reach the shared library.')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-status-root')).toBeTruthy();
  });

  it('shows an actionable sync issue control when provided', () => {
    const onActionPress = jest.fn();

    render(
      <CloudSyncStatus
        state="error"
        title="Refresh paused"
        message="We could not reach the shared library."
        actionLabel="View sync issue"
        onActionPress={onActionPress}
      />
    );

    fireEvent.press(screen.getByText('View sync issue'));

    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it('renders a success state as a calm informational card', () => {
    render(<CloudSyncStatus state="success" title="In sync" message="Everything is up to date." />);

    expect(screen.getByText('In sync')).toBeTruthy();
    expect(screen.getByText('Everything is up to date.')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-status-badge')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-status-root')).toHaveStyle({
      backgroundColor: colors.successSoft,
    });
  });
});
