"use client";

import { useCallback, useRef, useState } from "react";

interface UseDragOnGridOptions {
  onDrop: (position: { x: number; y: number }) => void;
  enabled?: boolean;
}

/**
 * Custom hook for dragging an element within a grid container.
 * Converts pixel coordinates to 0-100 grid coordinates.
 */
export function useDragOnGrid(
  gridRef: React.RefObject<HTMLDivElement | null>,
  { onDrop, enabled = true }: UseDragOnGridOptions
) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const toGridCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!gridRef.current) return { x: 50, y: 50 };
      const rect = gridRef.current.getBoundingClientRect();
      const x = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100));
      return { x, y };
    },
    [gridRef]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pos = toGridCoords(e.clientX, e.clientY);
      setIsDragging(true);
      setDragPos(pos);
      startRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    },
    [enabled, toGridCoords]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const pos = toGridCoords(e.clientX, e.clientY);
      setDragPos(pos);
    },
    [isDragging, toGridCoords]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const pos = toGridCoords(e.clientX, e.clientY);
      setIsDragging(false);
      setDragPos(pos);
      onDrop(pos);
    },
    [isDragging, toGridCoords, onDrop]
  );

  return {
    isDragging,
    dragPos,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
