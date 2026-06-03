"use client";

import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useId } from "react";
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
  // 사진 삭제 시 확인 대화상자 표시 (관리자 페이지처럼 자동저장 환경에서 사용)
  confirmRemove?: boolean;
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
  function MultiImageUploader({ values, maxCount, category, onChanged, label, confirmRemove }, ref) {
    const [slots, setSlots] = useState<ImageSlot[]>(
      values.map(url => ({ previewUrl: url, serverUrl: url, serverPath: null, uploading: false, failed: false }))
    );
    const pendingUploads = useRef<Map<number, Promise<{ path: string; url: string } | null>>>(new Map());
    const slotIdCounter = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();
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
      const urls = clean.map(s => s.serverUrl as string);
      const paths = clean.map(s => s.serverPath).filter((p): p is string => p !== null);
      onChanged?.(paths, urls);
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
          // 컴포넌트 unmount 시 setState 콜백이 호출되지 않아 updated 가
          // 초기값(빈 배열)으로 남아 DB 가 [] 로 덮여쓰는 버그를 막기 위해
          // slotsRef 기반으로 직접 계산한다.
          const base = slotsRef.current;
          const updated = base.map((s, i) =>
            i === slotIndex ? { ...s, serverUrl: data.signedUrl, serverPath: data.path, uploading: false } : s
          );
          slotsRef.current = updated;
          setSlots(updated);
          emitChange(updated);
          return { path: data.path, url: data.signedUrl };
        } else {
          const base = slotsRef.current;
          const updated = base.map((s, i) =>
            i === slotIndex ? { ...s, uploading: false, failed: true } : s
          );
          slotsRef.current = updated;
          setSlots(updated);
          return null;
        }
      } catch {
        const base = slotsRef.current;
        const updated = base.map((s, i) =>
          i === slotIndex ? { ...s, uploading: false, failed: true } : s
        );
        slotsRef.current = updated;
        setSlots(updated);
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

      // cropSrc / cropQueue 상태는 클로저로 읽어 side-effect 없이 판단
      const shouldOpen = cropSrc === null && cropQueue.length === 0;
      setCropQueue((prev) => [...prev, ...toAdd]);
      // openCropFor(setCropSrc)는 상태 업데이터 밖에서 호출해야 한다.
      // 업데이터 내부에서 호출하면 React Concurrent Mode에서 중복 실행·묵살될 수 있다.
      if (shouldOpen) {
        openCropFor(toAdd[0]);
      }
    }, [slots.length, maxCount, cropSrc, cropQueue.length, openCropFor]);

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

      // slotIndex / uploadId / uploadFile 호출은 상태 업데이터 밖에서 수행해야
      // React Concurrent Mode에서 중복 실행되지 않는다.
      const slotIndex = slotsRef.current.length;
      const uploadId = slotIdCounter.current++;
      const updated = [...slotsRef.current, newSlot];
      slotsRef.current = updated;
      setSlots(updated);

      // 이미 9:16 으로 크롭 + 1080x1920 해상도이므로 추가 리사이즈 생략
      const promise = uploadFile(croppedFile, slotIndex, uploadId, true);
      pendingUploads.current.set(uploadId, promise);

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
      const base = slotsRef.current;
      const slot = base[index];
      if (!slot) return;
      // 자동저장 환경에서는 즉시 DB 가 비워지므로 명시적 확인 필요.
      // 단, 업로드 실패한 슬롯은 정리 목적이므로 확인 없이 제거.
      if (confirmRemove && !slot.failed) {
        const ok = window.confirm(
          "이 사진을 삭제하시겠습니까?\n\n삭제 즉시 저장되며, 복구할 수 없습니다.",
        );
        if (!ok) return;
      }
      if (slot.previewUrl.startsWith("blob:")) URL.revokeObjectURL(slot.previewUrl);
      const updated = base.filter((_, i) => i !== index);
      slotsRef.current = updated;
      setSlots(updated);
      emitChange(updated);
    };

    // ── 버튼으로 순서 변경 ────────────────────────────
    const handleMoveLeft = (index: number) => {
      if (index <= 0) return;
      const arr = [...slotsRef.current];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      slotsRef.current = arr;
      setSlots(arr);
      emitChange(arr);
    };

    const handleMoveRight = (index: number) => {
      if (index >= slotsRef.current.length - 1) return;
      const arr = [...slotsRef.current];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      slotsRef.current = arr;
      setSlots(arr);
      emitChange(arr);
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
        <div className="flex gap-3 overflow-x-auto pt-2 pb-1">
          {slots.map((slot, i) => {
            const canMoveLeft = i > 0 && !slot.uploading && !slot.failed;
            const canMoveRight = i < slots.length - 1 && !slot.uploading && !slot.failed;
            return (
              <div key={i} className="relative flex-shrink-0 select-none">
                <div className={`w-20 aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 ${
                  slot.failed ? "ring-2 ring-red-400" : ""
                }`}>
                  <img
                    src={slot.previewUrl}
                    alt={`사진 ${i + 1}`}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
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
                {/* 삭제 버튼 */}
                {!slot.uploading && (
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {/* 순서 변경 버튼 (2장 이상일 때만 표시) */}
                {slots.length > 1 && !slot.uploading && !slot.failed && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveLeft(i)}
                      disabled={!canMoveLeft}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow transition-colors ${
                        canMoveLeft ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-800" : "bg-gray-300 cursor-not-allowed"
                      }`}
                      aria-label="왼쪽으로 이동"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveRight(i)}
                      disabled={!canMoveRight}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow transition-colors ${
                        canMoveRight ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-800" : "bg-gray-300 cursor-not-allowed"
                      }`}
                      aria-label="오른쪽으로 이동"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {slotsLeft > 0 && (
            <label
              htmlFor={inputId}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-20 aspect-[9/16] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#ff8a3d] hover:text-[#ff8a3d] transition-colors flex-shrink-0 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] mt-1">{slotsLeft > 1 ? `${slotsLeft}장 추가` : "추가"}</span>
            </label>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{slots.length}/{maxCount}장 · 9:16 비율로 영역 조정 가능{slots.length > 1 ? " · ◀▶ 버튼으로 순서 변경" : ""}</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChange}
        />

        {cropSrc && (
          <ImageCropperModal
            key={cropSrc}
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
