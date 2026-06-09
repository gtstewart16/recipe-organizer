import { clampSwipeOffset, shouldRevealSwipeAction } from './swipe-math';

describe('swipe math', () => {
  it('clamps offsets to the reveal width', () => {
    expect(clampSwipeOffset(-200, 104)).toBe(-104);
    expect(clampSwipeOffset(28, 104)).toBe(0);
  });

  it('uses a simple threshold to decide when to reveal the delete action', () => {
    expect(shouldRevealSwipeAction(-60, 52)).toBe(true);
    expect(shouldRevealSwipeAction(-24, 52)).toBe(false);
  });
});
