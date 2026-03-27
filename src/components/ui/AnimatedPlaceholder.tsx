'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface AnimatedPlaceholderProps {
  /** Array of placeholder texts to cycle through */
  texts: string[];
  /** Whether the placeholder is visible (typically: !value) */
  visible: boolean;
  /** Milliseconds each text is shown before transitioning */
  interval?: number;
  /** Additional CSS classes for positioning and styling */
  className?: string;
}

/**
 * Animated cycling placeholder — renders an overlay that fades between
 * multiple example texts, like Claude Desktop's profile input.
 *
 * Usage: position this absolutely inside a relative container that wraps
 * your textarea/input. Pass visible={!value} to hide when user types.
 */
export function AnimatedPlaceholder({
  texts,
  visible,
  interval = 3500,
  className = '',
}: AnimatedPlaceholderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'show' | 'exit' | 'enter'>('show');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cycle = useCallback(() => {
    setPhase('exit');
    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length);
      setPhase('enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('show');
        });
      });
    }, 320);
  }, [texts.length]);

  useEffect(() => {
    if (!visible || texts.length <= 1) return;
    const timer = setInterval(cycle, interval);
    return () => {
      clearInterval(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, texts.length, interval, cycle]);

  // Reset index when texts change
  useEffect(() => {
    setCurrentIndex(0);
    setPhase('show');
  }, [texts]);

  if (!visible || texts.length === 0) return null;

  return (
    <span
      aria-hidden="true"
      className={`animated-placeholder pointer-events-none select-none ${
        phase === 'exit'
          ? 'animated-placeholder-exit'
          : phase === 'enter'
            ? 'animated-placeholder-enter'
            : 'animated-placeholder-show'
      } ${className}`}
    >
      {texts[currentIndex]}
    </span>
  );
}
