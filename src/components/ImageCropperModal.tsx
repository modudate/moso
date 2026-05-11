"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

interface Props {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob) => void;
  title?: string;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    // blob: / data: URL 은 같은 origin 이므로 crossOrigin 을 붙이지 않는다.
    // 일부 안드로이드/삼성 브라우저는 blob URL 에 crossOrigin="anonymous" 가 붙으면
    // onerror 로 빠지는 이슈가 있어 외부 http(s) URL 일 때만 명시.
    if (/^https?:/i.test(src)) i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("이미지 로드 실패"));
    i.src = src;
  });
}

async function canvasToBlobSafe(canvas: HTMLCanvasElement): Promise<Blob> {
  // 출력 형식 우선순위: webp(품질↑/용량↓) → jpeg(호환성↑)
  // 일부 안드로이드/삼성 기본 브라우저는 WebP 인코딩(toBlob) 을 지원하지 않아 null 반환.
  // 이 경우 JPEG 로 폴백한다.
  const tryEncode = (type: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, q));

  const webp = await tryEncode("image/webp", 0.9);
  if (webp) return webp;
  const jpeg = await tryEncode("image/jpeg", 0.9);
  if (jpeg) return jpeg;
  throw new Error("브라우저가 이미지 인코딩을 지원하지 않습니다 (toBlob 실패)");
}

async function getCroppedBlob(src: string, crop: Area, outW: number, outH: number): Promise<Blob> {
  const img = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context 생성 실패");

  // 안드로이드 일부 환경에서 크롭 영역이 자연 크기를 1~2px 초과하면 drawImage 가
  // INVALID_STATE_ERR 를 던지는 경우가 있어 클램프 처리.
  const sx = Math.max(0, Math.min(crop.x, img.naturalWidth));
  const sy = Math.max(0, Math.min(crop.y, img.naturalHeight));
  const sw = Math.max(1, Math.min(crop.width, img.naturalWidth - sx));
  const sh = Math.max(1, Math.min(crop.height, img.naturalHeight - sy));

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  return await canvasToBlobSafe(canvas);
}

export default function ImageCropperModal({ src, aspect = 9 / 16, onCancel, onConfirm, title = "사진 영역 선택" }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!area) return;
    setSaving(true);
    try {
      // 9:16 출력 해상도: 가로 1080 기준. 크롭된 영역 크기에 맞춰 비율 유지.
      const targetW = 1080;
      const targetH = Math.round(targetW / aspect);
      const blob = await getCroppedBlob(src, area, targetW, targetH);
      onConfirm(blob);
    } catch (e) {
      console.error("[ImageCropperModal] crop failed", e);
      const detail = e instanceof Error ? e.message : "알 수 없는 오류";
      alert(`크롭 처리에 실패했습니다.\n(${detail})\n\n다시 시도하거나, 사진 형식을 JPG/PNG 로 바꾸어 보세요.`);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onCancel} className="text-muted-fg hover:text-foreground" aria-label="닫기">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative bg-black" style={{ height: "min(70vh, 560px)" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
            restrictPosition
          />
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-muted-fg mb-1 block">확대</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#ff8a3d]"
            />
          </div>
          <p className="text-[11px] text-muted-fg">
            드래그해서 위치를 조정하고, 슬라이더 또는 마우스 휠로 확대할 수 있어요. 9:16 비율로 잘립니다.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-border font-semibold text-foreground hover:bg-gray-50 transition-colors disabled:opacity-40">
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!area || saving}
            className="flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#ff8a3d" }}>
            {saving ? "처리 중..." : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
