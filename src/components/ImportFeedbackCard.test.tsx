import { fireEvent, render, screen } from '@testing-library/react-native';

import { ImportFeedbackCard } from './ImportFeedbackCard';

describe('ImportFeedbackCard', () => {
  it('renders fallback guidance and a retry action for a failed recipe link import', () => {
    const onRetry = jest.fn();

    render(
      <ImportFeedbackCard
        tone="error"
        title="Could not import this recipe link"
        message="The site did not expose a full recipe."
        guidance={[
          'Try a different recipe page with the full ingredients and directions.',
          'You can still open the review draft and fill in missing details manually.',
        ]}
        primaryAction={{ label: 'Try another link', onPress: onRetry }}
      />
    );

    expect(screen.getByTestId('import-feedback-card')).toBeTruthy();
    expect(screen.getByText('Could not import this recipe link')).toBeTruthy();
    expect(screen.getByText('The site did not expose a full recipe.')).toBeTruthy();
    expect(screen.getByText(/Try a different recipe page with the full ingredients and directions\./)).toBeTruthy();
    expect(screen.getByText(/You can still open the review draft and fill in missing details manually\./)).toBeTruthy();
    expect(screen.getByText('Try another link')).toBeTruthy();

    fireEvent.press(screen.getByText('Try another link'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders an informational tone for photo import fallback guidance', () => {
    render(
      <ImportFeedbackCard
        tone="info"
        title="Cookbook photo imported"
        message="We used the photo as a draft so you can finish the recipe."
        secondaryAction={{ label: 'Back to import', onPress: jest.fn() }}
      />
    );

    expect(screen.getByText('Cookbook photo imported')).toBeTruthy();
    expect(screen.getByText('We used the photo as a draft so you can finish the recipe.')).toBeTruthy();
    expect(screen.getByText('Back to import')).toBeTruthy();
    expect(screen.getByTestId('import-feedback-card')).toBeTruthy();
  });
});
