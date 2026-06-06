import { useState } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type InteractivePressableChildState = {
  pressed: boolean;
  textStyle: StyleProp<TextStyle>;
};

export type InteractivePressableProps = Omit<PressableProps, 'children'> & {
  children: React.ReactNode | ((state: InteractivePressableChildState) => React.ReactNode);
  textStyle?: StyleProp<TextStyle>;
  pressedOpacity?: number;
  pressedScale?: number;
  style?: PressableProps['style'];
};

export function InteractivePressable({
  children,
  textStyle,
  pressedOpacity = 0.78,
  pressedScale = 1,
  accessibilityRole = 'button',
  onPressIn,
  onPressOut,
  style,
  ...rest
}: InteractivePressableProps) {
  const [pressed, setPressed] = useState(false);

  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    setPressed(true);
    onPressIn?.(event);
  };

  const handlePressOut: PressableProps['onPressOut'] = (event) => {
    setPressed(false);
    onPressOut?.(event);
  };

  const childState: InteractivePressableChildState = {
    pressed,
    textStyle: [styles.text, textStyle, pressed && { opacity: pressedOpacity }],
  };
  const pressedContainerStyle: ViewStyle = {
    opacity: pressedOpacity,
    ...(pressedScale === 1 ? null : { transform: [{ scale: pressedScale }] }),
  };

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed: nativePressed }) => [
        typeof style === 'function' ? style({ pressed: nativePressed }) : style,
        (pressed || nativePressed) && pressedContainerStyle,
      ]}
      {...rest}
    >
      {typeof children === 'function' ? children(childState) : children}
    </Pressable>
  );
}

const styles = {
  text: {
    opacity: 1,
  },
};
