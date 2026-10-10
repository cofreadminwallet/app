import { useState, useEffect, useRef, useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 110,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent, scrollContainer: HTMLElement | null) => {
      if (disabled || isRefreshing) return;
      // Only activate pull-to-refresh when at absolute top (scrollTop <= 0)
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      if (scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent, scrollContainer: HTMLElement | null) => {
      if (!isPullingRef.current || startYRef.current === null || disabled || isRefreshing) return;

      const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      if (scrollTop > 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      currentYRef.current = e.touches[0].clientY;
      const rawDiff = currentYRef.current - startYRef.current;

      if (rawDiff > 0) {
        // Aplica resistência suave (curva exponencial suave)
        const damped = Math.min(rawDiff * 0.45, maxPull);
        setPullDistance(damped);

        if (damped >= threshold && pullDistance < threshold) {
          triggerHaptic('light');
        }
      } else {
        setPullDistance(0);
      }
    },
    [disabled, isRefreshing, maxPull, threshold, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      triggerHaptic('medium');
      setIsRefreshing(true);
      setPullDistance(threshold * 0.7); // Mantém o indicador visível durante o refresh

      try {
        await onRefresh();
        triggerHaptic('success');
      } catch (err) {
        console.warn('Pull-to-refresh warning:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    startYRef.current = null;
    currentYRef.current = null;
  }, [disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    isTriggered: pullDistance >= threshold,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
