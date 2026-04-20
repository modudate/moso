"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  photos: string[];
  alt?: string;
};

export default function PhotoCarousel({ photos, alt = "사진" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

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
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (photos.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {photos.map((url, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-full aspect-[3/4] bg-muted snap-start"
          >
            <img
              src={url}
              alt={`${alt} ${i + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          {/* 상단 진행 바 (인스타 스토리 스타일) */}
          <div className="absolute top-2 left-3 right-3 flex gap-1 pointer-events-none">
            {photos.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className={`h-full bg-white transition-all ${i === index ? "w-full" : i < index ? "w-full opacity-70" : "w-0"}`}
                />
              </div>
            ))}
          </div>

          {/* 좌우 터치 영역 (모바일에서도 탭 이동) */}
          <button
            onClick={() => goTo(Math.max(0, index - 1))}
            className="absolute left-0 top-0 w-1/3 h-full"
            aria-label="이전"
          />
          <button
            onClick={() => goTo(Math.min(photos.length - 1, index + 1))}
            className="absolute right-0 top-0 w-1/3 h-full"
            aria-label="다음"
          />

          {/* 하단 점 인디케이터 */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? "bg-white w-4" : "bg-white/50"}`}
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
