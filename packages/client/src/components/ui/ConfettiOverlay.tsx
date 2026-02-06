import React from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOverlayProps {
  trigger: boolean;
}

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({ trigger }) => {
  const prevTriggerRef = React.useRef(false);

  React.useEffect(() => {
    if (trigger && !prevTriggerRef.current) {
      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        ticks: 120,
        gravity: 1.2,
        scalar: 0.9,
        drift: 0,
        disableForReducedMotion: true,
      });
    }
    prevTriggerRef.current = trigger;
  }, [trigger]);

  return null;
};
