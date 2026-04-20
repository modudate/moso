"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  photos: string[];
  alt?: string;
};

export default function PhotoCarousel({ photos, alt = "사진" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== index) setIndex(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [index]);

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.pointerType === "touch") return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    drag.current.active = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
    const pageWidth = el.clientWidth;
    const nearest = Math.round(el.scrollLeft / pageWidth);
    const dx = el.scrollLeft - drag.current.startLeft;
    let target = nearest;
    if (Math.abs(dx) > pageWidth * 0.15) {
      target = dx > 0 ? Math.ceil(drag.current.startLeft / pageWidth) + 0 : Math.floor(drag.current.startLeft / pageWidth);
      if (dx > 0) target = Math.round(drag.current.startLeft / pageWidth) + 1;
      else target = Math.round(drag.current.startLeft / pageWidth) - 1;
    }
    goTo(target);
  };

  if (photos.length === 0) return null;

  return (
    <div className="relative select-none">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {photos.map((url, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-full aspect-square bg-muted snap-start"
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

      {photos.length > 1 && (
        <>
          {/* 좌 화살표 */}
          {index > 0 && (
            <button
              onClick={() => goTo(index - 1)}
              aria-label="이전 사진"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* 우 화살표 */}
          {index < photos.length - 1 && (
            <button
              onClick={() => goTo(index + 1)}
              aria-label="다음 사진"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* 하단 점 인디케이터 */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? "bg-white w-4" : "bg-white/50 w-1.5"}`}
              />
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
