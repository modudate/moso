"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";

export interface ImageUploaderHandle {
  waitForUpload: () => Promise<{ path: string; url: string } | null>;
  hasPending: () => boolean;
}

interface ImageUploaderProps {
  value: string | null;
  category: "photo" | "charm" | "date";
  onUploaded?: (path: string, signedUrl: string) => void;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
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

const ImageUploader = forwardRef<ImageUploaderHandle, ImageUploaderProps>(
  function ImageUploader({ value, category, onUploaded, onRemove, size = "md", label }, ref) {
    const [preview, setPreview] = useState<string | null>(value);
    const [uploading, setUploading] = useState(false);
    const [failed, setFailed] = useState(false);
    const pendingUpload = useRef<Promise<{ path: string; url: string } | null> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const sizeClass = size === "sm" ? "w-24 h-24" : size === "lg" ? "w-40 h-40" : "w-32 h-32";

    useImperativeHandle(ref, () => ({
      hasPending: () => uploading,
      waitForUpload: async () => {
        if (pendingUpload.current) return pendingUpload.current;
        return null;
      },
    }));

    const doUpload = async (file: File): Promise<{ path: string; url: string } | null> => {
      try {
        const resized = await resizeImage(file, 1200, 1600, 0.85);
        const formData = new FormData();
        formData.append("file", new File([resized], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
        formData.append("category", category);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          setPreview(data.signedUrl);
          setUploading(false);
          setFailed(false);
          onUploaded?.(data.path, data.signedUrl);
          return { path: data.path, url: data.signedUrl };
        } else {
          setUploading(false);
          setFailed(true);
          return null;
        }
      } catch {
        setUploading(false);
        setFailed(true);
        return null;
      } finally {
        pendingUpload.current = null;
      }
    };

    const handleFile = (file: File) => {
      const blobUrl = URL.createObjectURL(file);
      setPreview(blobUrl);
      setUploading(true);
      setFailed(false);
      pendingUpload.current = doUpload(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    };

    const handleRemoveClick = () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(null);
      setUploading(false);
      setFailed(false);
      pendingUpload.current = null;
      onRemove?.();
    };

    return (
      <div>
        {label && <p className="text-xs text-gray-500 mb-2">{label}</p>}
        <div className="relative inline-block">
          {preview ? (
            <>
              <div
                className={`${sizeClass} rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-[#ff8a3d] transition-all ${failed ? "ring-2 ring-red-400" : ""}`}
                onClick={() => inputRef.current?.click()}
              >
                <img src={preview} alt={label || "사진"} className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {failed && (
                  <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center rounded-xl">
                    <span className="text-white text-xs font-medium">업로드 실패</span>
                  </div>
                )}
              </div>
              {(onRemove || failed) && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveClick(); }}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`${sizeClass} rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#ff8a3d] hover:text-[#ff8a3d] transition-colors`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] mt-1">사진 등록</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      </div>
    );
  }
);

export default ImageUploader;
