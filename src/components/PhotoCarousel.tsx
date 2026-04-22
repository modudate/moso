"use client";

import { useRef, useState } from "react";

type Props = {
  photos: string[];
  alt?: string;
};

export default function PhotoCarousel({ photos, alt = "사진" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    locked: false as false | "x" | "y",
    pointerId: 0,
  });

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    setIndex(clamped);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (photos.length <= 1) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      locked: false,
      pointerId: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;

    // 처음 일정 거리 이상 움직이면 가로/세로 방향 결정 (가로일 때만 가로채기)
    if (!drag.current.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.current.locked === "x") {
        try {
          containerRef.current?.setPointerCapture(drag.current.pointerId);
        } catch {
          // ignore
        }
        setDragging(true);
      }
    }

    if (drag.current.locked === "x") {
      // 양 끝에서 약한 저항감 (rubber-band)
      let offset = dx;
      if (
        (index === 0 && dx > 0) ||
        (index === photos.length - 1 && dx < 0)
      ) {
        offset = dx * 0.3;
      }
      setDragOffset(offset);
    }
  };

  const finishDrag = (clientX: number) => {
    if (!drag.current.active) return;
    const wasLockedX = drag.current.locked === "x";
    const dx = clientX - drag.current.startX;
    const w = containerRef.current?.clientWidth ?? 1;
    drag.current.active = false;
    drag.current.locked = false;
    try {
      containerRef.current?.releasePointerCapture(drag.current.pointerId);
    } catch {
      // ignore
    }
    if (wasLockedX) {
      // 시작 위치 기준 ±1 또는 0. 절대로 한 번에 2칸 이상 이동 금지.
      const threshold = Math.min(60, w * 0.15);
      let next = index;
      if (dx > threshold) next = index - 1;
      else if (dx < -threshold) next = index + 1;
      next = Math.max(0, Math.min(photos.length - 1, next));
      setIndex(next);
      setDragging(false);
      setDragOffset(0);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => finishDrag(e.clientX);
  const onPointerCancel = (e: React.PointerEvent) =>
    finishDrag(e.clientX || drag.current.startX);

  if (photos.length === 0) return null;

  const transform = dragging
    ? `translate3d(calc(${-index * 100}% + ${dragOffset}px), 0, 0)`
    : `translate3d(${-index * 100}%, 0, 0)`;

  return (
    <div className="relative select-none">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex w-full will-change-transform"
          style={{
            transform,
            transition: dragging
              ? "none"
              : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {photos.map((url, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-full aspect-[9/16] bg-muted"
            >
              <img
                src={url}
                alt={`${alt} ${i + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {photos.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={() => goTo(index - 1)}
              aria-label="이전 사진"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors z-10"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              onClick={() => goTo(index + 1)}
              aria-label="다음 사진"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors z-10"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "bg-white w-4" : "bg-white/50 w-1.5"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
