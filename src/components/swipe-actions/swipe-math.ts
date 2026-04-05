export const DEFAULT_SWIPE_REVEAL_WIDTH = 104;
export const DEFAULT_SWIPE_REVEAL_THRESHOLD = 52;

export function clampSwipeOffset(offset: number, revealWidth = DEFAULT_SWIPE_REVEAL_WIDTH) {
  return Math.max(-revealWidth, Math.min(0, offset));
}

export function shouldRevealSwipeAction(offset: number, threshold = DEFAULT_SWIPE_REVEAL_THRESHOLD) {
  return offset <= -threshold;
}
