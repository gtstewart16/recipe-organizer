import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SwipeToDeleteRow } from './SwipeToDeleteRow';

describe('SwipeToDeleteRow', () => {
  it('renders the content and keeps the delete affordance collapsed until swiped', () => {
    render(
      <SwipeToDeleteRow actionLabel="Delete recipe" onAction={jest.fn()}>
        <Text>Recipe row</Text>
      </SwipeToDeleteRow>
    );

    expect(screen.getByText('Recipe row')).toBeTruthy();
    expect(screen.getByTestId('swipe-to-delete-action')).toHaveStyle({ opacity: 0.001 });
    expect(screen.getByTestId('swipe-to-delete-action-button')).toHaveProp('accessibilityState', { expanded: false });
  });

  it('exposes swipe-ready content and destructive action test hooks for app integration', () => {
    render(
      <SwipeToDeleteRow actionLabel="Delete recipe" onAction={jest.fn()}>
        <Text>Recipe row</Text>
      </SwipeToDeleteRow>
    );

    expect(screen.getByTestId('swipe-to-delete-content')).toBeTruthy();
    expect(screen.getByTestId('swipe-to-delete-action')).toBeTruthy();
    expect(screen.getByTestId('swipe-to-delete-action-button')).toBeTruthy();
  });
});
