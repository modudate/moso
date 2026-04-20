"use client";

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from "react";

interface ImageSlot {
  previewUrl: string;
  serverUrl: string | null;
  serverPath: string | null;
  uploading: boolean;
  failed: boolean;
}

export interface MultiImageUploaderHandle {
  waitForUploads: () => Promise<{ paths: string[]; urls: string[] }>;
  hasPending: () => boolean;
}

interface MultiImageUploaderProps {
  values: string[];
  maxCount: number;
  category: "photo";
  onChanged?: (paths: string[], urls: string[]) => void;
  label?: string;
}

function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("리사이즈 실패"))),
        "image/webp",
        quality,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const MultiImageUploader = forwardRef<MultiImageUploaderHandle, MultiImageUploaderProps>(
  function MultiImageUploader({ values, maxCount, category, onChanged, label }, ref) {
    const [slots, setSlots] = useState<ImageSlot[]>(
      values.map(url => ({ previewUrl: url, serverUrl: url, serverPath: null, uploading: false, failed: false }))
    );
    const pendingUploads = useRef<Map<number, Promise<{ path: string; url: string } | null>>>(new Map());
    const slotIdCounter = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      hasPending: () => {
        return slots.some(s => s.uploading);
      },
      waitForUploads: async () => {
        await Promise.all(Array.from(pendingUploads.current.values()));
        // blob: URL 은 업로드 실패/미완료 상태이므로 결과에서 제외
        const current = slotsRef.current.filter(
          s => !s.failed && s.serverUrl && !s.serverUrl.startsWith("blob:")
        );
        return {
          paths: current.map(s => s.serverPath).filter((p): p is string => p !== null),
          urls: current.map(s => s.serverUrl as string),
        };
      },
    }));

    const slotsRef = useRef(slots);
    slotsRef.current = slots;

    const emitChange = useCallback((next: ImageSlot[]) => {
      // blob: URL(아직 업로드 중 또는 실패)은 절대 DB 로 흘리지 않는다
      const clean = next.filter(s => !s.failed && s.serverUrl && !s.serverUrl.startsWith("blob:"));
      onChanged?.(
        clean.map(s => s.serverPath).filter((p): p is string => p !== null),
        clean.map(s => s.serverUrl as string),
      );
    }, [onChanged]);

    const uploadFile = useCallback(async (file: File, slotIndex: number, uploadId: number) => {
      try {
        const resized = await resizeImage(file, 1200, 1600, 0.85);
        const formData = new FormData();
        formData.append("file", new File([resized], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
        formData.append("category", category);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          let updated: ImageSlot[] = [];
          setSlots(prev => {
            updated = prev.map((s, i) =>
              i === slotIndex ? { ...s, serverUrl: data.signedUrl, serverPath: data.path, uploading: false } : s
            );
            return updated;
          });
          emitChange(updated);
          return { path: data.path, url: data.signedUrl };
        } else {
          setSlots(prev => prev.map((s, i) =>
            i === slotIndex ? { ...s, uploading: false, failed: true } : s
          ));
          return null;
        }
      } catch {
        setSlots(prev => prev.map((s, i) =>
          i === slotIndex ? { ...s, uploading: false, failed: true } : s
        ));
        return null;
      } finally {
        pendingUploads.current.delete(uploadId);
      }
    }, [category, emitChange]);

    const handleFiles = useCallback((files: File[]) => {
      const remaining = maxCount - slots.length;
      if (remaining <= 0) return;
      const toAdd = files.slice(0, remaining);

      const newSlots: ImageSlot[] = toAdd.map(file => ({
        previewUrl: URL.createObjectURL(file),
        serverUrl: null,
        serverPath: null,
        uploading: true,
        failed: false,
      }));

      setSlots(prev => {
        const updated = [...prev, ...newSlots];
        toAdd.forEach((file, i) => {
          const slotIndex = prev.length + i;
          const uploadId = slotIdCounter.current++;
          const promise = uploadFile(file, slotIndex, uploadId);
          pendingUploads.current.set(uploadId, promise);
        });
        return updated;
      });
    }, [slots.length, maxCount, uploadFile]);

    const handleRemove = (index: number) => {
      const slot = slots[index];
      if (slot.previewUrl.startsWith("blob:")) URL.revokeObjectURL(slot.previewUrl);
      let updated: ImageSlot[] = [];
      setSlots(prev => {
        updated = prev.filter((_, i) => i !== index);
        return updated;
      });
      emitChange(updated);
    };

    const handleRetry = (index: number) => {
      // Can't retry without original file — just remove the failed slot
      handleRemove(index);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) handleFiles(Array.from(fileList));
      if (inputRef.current) inputRef.current.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const fileList = e.dataTransfer.files;
      if (fileList && fileList.length > 0) handleFiles(Array.from(fileList));
    };

    const slotsLeft = maxCount - slots.length;

    return (
      <div>
        {label && <p className="text-sm font-semibold mb-2">{label}</p>}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {slots.map((slot, i) => (
            <div key={i} className="relative flex-shrink-0">
              <div className={`w-28 h-28 rounded-xl overflow-hidden bg-gray-100 ${slot.failed ? "ring-2 ring-red-400" : ""}`}>
                <img src={slot.previewUrl} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
                {slot.uploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {slot.failed && (
                  <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center rounded-xl cursor-pointer" onClick={() => handleRetry(i)}>
                    <span className="text-white text-xs font-medium">실패 · 탭하여 제거</span>
                  </div>
                )}
              </div>
              <span className="absolute top-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">{i + 1}</span>
              {!slot.uploading && (
                <button
                  onClick={() => handleRemove(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {slotsLeft > 0 && (
            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#ff8a3d] hover:text-[#ff8a3d] transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] mt-1">{slotsLeft > 1 ? `${slotsLeft}장 추가` : "추가"}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{slots.length}/{maxCount}장 · 여러 장 동시 선택 가능</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </div>
    );
  }
);

export default MultiImageUploader;
