import { useState } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
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
  pressedOpacity = 0.92,
  pressedScale = 0.985,
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

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed: nativePressed }) => [
        typeof style === 'function' ? style({ pressed: nativePressed }) : style,
        (pressed || nativePressed) && {
          opacity: pressedOpacity,
          transform: [{ scale: pressedScale }],
        },
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
