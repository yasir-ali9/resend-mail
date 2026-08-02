"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseFluidHighlightReturn {
  showHighlight: (element: HTMLElement) => void;
  hideHighlight: () => void;
  highlightStyle: CSSProperties;
}

export function useFluidHighlight(
  isOpen: boolean,
): UseFluidHighlightReturn {
  const [rect, setRect] = useState<HighlightRect>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const [visible, setVisible] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const hasRevealedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen && animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const showHighlight = useCallback((element: HTMLElement) => {
    const nextRect = {
      top: element.offsetTop,
      left: element.offsetLeft,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };

    if (!hasRevealedRef.current) {
      setRect(nextRect);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        hasRevealedRef.current = true;
        setHasRevealed(true);
        setVisible(true);
      });
      return;
    }

    setRect(nextRect);
    setVisible(true);
  }, []);

  const hideHighlight = useCallback(() => {
    setVisible(false);
    setHasRevealed(false);
    hasRevealedRef.current = false;
  }, []);

  const highlightStyle: CSSProperties = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    opacity: isOpen && visible ? 1 : 0,
    transition:
      visible && hasRevealed
        ? "top 50ms ease-out, left 50ms ease-out, width 50ms ease-out, height 50ms ease-out, opacity 50ms"
        : "opacity 50ms",
  };

  return { showHighlight, hideHighlight, highlightStyle };
}
