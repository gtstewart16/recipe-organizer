import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { InteractivePressable } from '../InteractivePressable';
import {
  clampSwipeOffset,
  DEFAULT_SWIPE_REVEAL_THRESHOLD,
  DEFAULT_SWIPE_REVEAL_WIDTH,
  shouldRevealSwipeAction,
} from './swipe-math';

type SwipePoint = {
  x: number;
  y: number;
};

export type SwipeToDeleteRowProps = {
  children: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  testID?: string;
  contentTestID?: string;
  actionTestID?: string;
  disabled?: boolean;
  revealWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
  actionStyle?: StyleProp<ViewStyle>;
};

export function SwipeToDeleteRow({
  children,
  actionLabel,
  onAction,
  testID = 'swipe-to-delete-row',
  contentTestID = 'swipe-to-delete-content',
  actionTestID = 'swipe-to-delete-action',
  disabled = false,
  revealWidth = DEFAULT_SWIPE_REVEAL_WIDTH,
  contentStyle,
  actionStyle,
}: SwipeToDeleteRowProps) {
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined);
  const [isRevealed, setIsRevealed] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureOriginRef = useRef<SwipePoint>({ x: 0, y: 0 });
  const gestureOffsetRef = useRef(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setRowHeight(event.nativeEvent.layout.height);
  };

  const open = () => {
    gestureOffsetRef.current = -revealWidth;
    setIsRevealed(true);
    Animated.spring(translateX, {
      toValue: -revealWidth,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const close = () => {
    gestureOffsetRef.current = 0;
    setIsRevealed(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          if (disabled) {
            return false;
          }

          return Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onPanResponderGrant: (event) => {
          gestureOriginRef.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          };
        },
        onPanResponderMove: (_event, gestureState) => {
          if (disabled) {
            return;
          }

          const nextOffset = clampSwipeOffset(gestureOffsetRef.current + gestureState.dx, revealWidth);
          translateX.setValue(nextOffset);
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (disabled) {
            close();
            return;
          }

          const nextOffset = clampSwipeOffset(gestureOffsetRef.current + gestureState.dx, revealWidth);
          gestureOffsetRef.current = nextOffset;

          if (shouldRevealSwipeAction(nextOffset, DEFAULT_SWIPE_REVEAL_THRESHOLD)) {
            open();
          } else {
            close();
          }
        },
        onPanResponderTerminate: () => {
          if (isRevealed) {
            open();
          } else {
            close();
          }
        },
      }),
    [disabled, isRevealed, revealWidth, translateX]
  );

  const actionContainerStyle = useMemo(
    () => [
      styles.actionContainer,
      { width: revealWidth + 8, opacity: isRevealed ? 1 : 0.001 },
      actionStyle,
    ],
    [actionStyle, isRevealed, revealWidth]
  );

  return (
    <View style={styles.root} testID={testID} onLayout={handleLayout}>
      <View style={actionContainerStyle} testID={actionTestID} pointerEvents={isRevealed ? 'auto' : 'none'}>
        <InteractivePressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isRevealed }}
          onPress={() => {
            onAction();
            close();
          }}
          style={styles.actionButton}
          testID={`${actionTestID}-button`}
        >
          <View style={styles.actionButtonInner}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
            <Text style={styles.actionHint}>Delete</Text>
          </View>
        </InteractivePressable>
      </View>

      <Animated.View
        style={[
          styles.content,
          { height: rowHeight, transform: [{ translateX }] },
          contentStyle,
        ]}
        testID={contentTestID}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    position: 'relative',
  },
  actionContainer: {
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  actionButton: {
    backgroundColor: '#b5483d',
    borderColor: '#e7b6ae',
    borderRadius: 26,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 16,
  },
  actionButtonInner: {
    alignItems: 'flex-start',
    gap: 2,
  },
  actionLabel: {
    color: '#fff7f5',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  actionHint: {
    color: '#f7d6cf',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  content: {
    backgroundColor: 'transparent',
  },
});
