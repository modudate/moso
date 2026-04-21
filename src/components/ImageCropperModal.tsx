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

async function getCroppedBlob(src: string, crop: Area, outW: number, outH: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context error");

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, outW, outH,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob 실패"))),
      "image/webp",
      0.9,
    );
  });
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
      console.error(e);
      alert("크롭 처리에 실패했습니다. 다시 시도해주세요.");
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
