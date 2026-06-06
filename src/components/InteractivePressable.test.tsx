import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { InteractivePressable } from './InteractivePressable';

describe('InteractivePressable', () => {
  it('renders plain children, forwards presses, and applies pressed feedback', () => {
    const onPress = jest.fn();

    render(
      <InteractivePressable
        testID="interactive-pressable"
        style={{ padding: 12 }}
        onPress={onPress}
      >
        <Text>Tap me</Text>
      </InteractivePressable>
    );

    expect(screen.getByText('Tap me')).toBeTruthy();

    fireEvent(screen.getByTestId('interactive-pressable'), 'pressIn');
    expect(screen.getByTestId('interactive-pressable')).toHaveStyle({
      opacity: 0.78,
    });

    fireEvent(screen.getByTestId('interactive-pressable'), 'pressOut');

    fireEvent.press(screen.getByTestId('interactive-pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps custom pressed opacity and scale meaningful for callers', () => {
    render(
      <InteractivePressable
        testID="custom-feedback"
        pressedOpacity={0.6}
        pressedScale={0.97}
      >
        <Text>Custom feedback</Text>
      </InteractivePressable>
    );

    fireEvent(screen.getByTestId('custom-feedback'), 'pressIn');

    expect(screen.getByTestId('custom-feedback')).toHaveStyle({
      opacity: 0.6,
      transform: [{ scale: 0.97 }],
    });
  });

  it('supports render-prop children with pressed state and textStyle', () => {
    render(
      <InteractivePressable
        testID="interactive-render-prop"
        textStyle={{ color: '#24546f', fontWeight: '700' }}
      >
        {({ pressed, textStyle }) => (
          <Text testID="rendered-label" style={textStyle}>
            {pressed ? 'Pressed' : 'Idle'}
          </Text>
        )}
      </InteractivePressable>
    );

    expect(screen.getByTestId('rendered-label')).toHaveTextContent('Idle');
    expect(screen.getByTestId('rendered-label')).toHaveStyle({
      color: '#24546f',
      fontWeight: '700',
      opacity: 1,
    });

    fireEvent(screen.getByTestId('interactive-render-prop'), 'pressIn');

    expect(screen.getByTestId('rendered-label')).toHaveTextContent('Pressed');
    expect(screen.getByTestId('rendered-label')).toHaveStyle({
      color: '#24546f',
      fontWeight: '700',
      opacity: 0.78,
    });

    fireEvent(screen.getByTestId('interactive-render-prop'), 'pressOut');

    expect(screen.getByTestId('rendered-label')).toHaveTextContent('Idle');
    expect(screen.getByTestId('rendered-label')).toHaveStyle({
      color: '#24546f',
      fontWeight: '700',
      opacity: 1,
    });
  });
});
