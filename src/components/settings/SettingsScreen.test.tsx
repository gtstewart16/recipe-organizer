import { fireEvent, render, screen } from '@testing-library/react-native';

import { SettingsScreen } from './SettingsScreen';

describe('SettingsScreen', () => {
  it('renders title and sign-out action', () => {
    render(<SettingsScreen onClose={jest.fn()} onSignOut={jest.fn()} />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(screen.getByLabelText('Close settings')).toBeTruthy();
    expect(screen.getByTestId('settings-screen')).toBeTruthy();
  });

  it('calls onClose when the close control is pressed', () => {
    const onClose = jest.fn();

    render(<SettingsScreen onClose={onClose} onSignOut={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Close settings'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSignOut when the sign-out action is pressed', () => {
    const onSignOut = jest.fn();

    render(<SettingsScreen onClose={jest.fn()} onSignOut={onSignOut} />);

    fireEvent.press(screen.getByLabelText('Sign out'));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
