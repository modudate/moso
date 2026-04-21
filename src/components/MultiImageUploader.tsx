"use client";

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import ImageCropperModal from "./ImageCropperModal";

interface ImageSlot {
  previewUrl: string;
  serverUrl: string | null;
  serverPath: string | null;
  uploading: boolean;
  failed: boolean;
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || "image/webp" });
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
    // 크롭 대기열: 한 번에 한 파일씩 크롭 모달에서 처리
    const [cropQueue, setCropQueue] = useState<File[]>([]);
    const [cropSrc, setCropSrc] = useState<string | null>(null);

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

    const uploadFile = useCallback(async (file: File, slotIndex: number, uploadId: number, skipResize = false) => {
      try {
        const blob = skipResize
          ? file
          : await resizeImage(file, 1200, 1600, 0.85);
        const formData = new FormData();
        formData.append("file", new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
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

    const openCropFor = useCallback((file: File) => {
      const url = URL.createObjectURL(file);
      setCropSrc(url);
    }, []);

    const handleFiles = useCallback((files: File[]) => {
      const remaining = maxCount - slots.length;
      if (remaining <= 0) return;
      const toAdd = files.slice(0, remaining);
      if (toAdd.length === 0) return;

      setCropQueue((prev) => {
        const already = prev.length > 0 || cropSrc !== null;
        const merged = [...prev, ...toAdd];
        if (!already) {
          // 대기열이 비어 있었으면 첫 파일로 크롭 모달 열기
          openCropFor(toAdd[0]);
        }
        return merged;
      });
    }, [slots.length, maxCount, cropSrc, openCropFor]);

    const handleCropConfirm = useCallback((blob: Blob) => {
      const currentFile = cropQueue[0];
      const fileName = (currentFile?.name || "photo").replace(/\.\w+$/, ".webp");
      const croppedFile = blobToFile(blob, fileName);
      const previewUrl = URL.createObjectURL(blob);

      if (cropSrc) URL.revokeObjectURL(cropSrc);

      const newSlot: ImageSlot = {
        previewUrl,
        serverUrl: null,
        serverPath: null,
        uploading: true,
        failed: false,
      };

      setSlots((prev) => {
        const slotIndex = prev.length;
        const updated = [...prev, newSlot];
        const uploadId = slotIdCounter.current++;
        // 이미 9:16 으로 크롭 + 1080x1920 해상도이므로 추가 리사이즈 생략
        const promise = uploadFile(croppedFile, slotIndex, uploadId, true);
        pendingUploads.current.set(uploadId, promise);
        return updated;
      });

      // 큐에서 처리한 파일 제거 후, 다음 파일 있으면 이어서 크롭
      const next = cropQueue.slice(1);
      setCropQueue(next);
      if (next.length > 0) {
        openCropFor(next[0]);
      } else {
        setCropSrc(null);
      }
    }, [cropSrc, cropQueue, uploadFile, openCropFor]);

    const handleCropCancel = useCallback(() => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      setCropQueue([]);
    }, [cropSrc]);

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
              <div className={`w-20 aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 ${slot.failed ? "ring-2 ring-red-400" : ""}`}>
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
              className="w-20 aspect-[9/16] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#ff8a3d] hover:text-[#ff8a3d] transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] mt-1">{slotsLeft > 1 ? `${slotsLeft}장 추가` : "추가"}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{slots.length}/{maxCount}장 · 업로드 후 9:16 비율로 영역을 조정할 수 있어요</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleChange}
        />

        {cropSrc && (
          <ImageCropperModal
            src={cropSrc}
            aspect={9 / 16}
            onCancel={handleCropCancel}
            onConfirm={handleCropConfirm}
            title="대표 사진 영역 선택 (9:16)"
          />
        )}
      </div>
    );
  }
);

export default MultiImageUploader;
