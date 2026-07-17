import { TouchEvent, useState } from 'react';

interface SwipeInput {
  onSwipedLeft?: () => void;
  onSwipedRight?: () => void;
}

export function useSwipe({ onSwipedLeft, onSwipedRight }: SwipeInput) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // min swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipedLeft) {
      onSwipedLeft();
    } else if (isRightSwipe && onSwipedRight) {
      onSwipedRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: onTouchEndHandler,
  };
}
