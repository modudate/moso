"use client";

import { useState, useRef } from "react";

interface ImageUploaderProps {
  value: string | null;
  category: "photo" | "charm" | "date";
  onUploaded: (path: string, signedUrl: string) => void;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function ImageUploader({ value, category, onUploaded, onRemove, size = "md", label }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClass = size === "sm" ? "w-24 h-24" : size === "lg" ? "w-40 h-40" : "w-32 h-32";

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setPreview(data.signedUrl);
        onUploaded(data.path, data.signedUrl);
      } else {
        alert(data.error || "업로드 실패");
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div>
      {label && <p className="text-xs text-muted-fg mb-2">{label}</p>}
      <div className="relative inline-block">
        {preview ? (
          <>
            <div
              className={`${sizeClass} rounded-xl overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
              onClick={() => inputRef.current?.click()}
            >
              <img src={preview} alt={label || "사진"} className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); setPreview(null); }}
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
            disabled={uploading}
            className={`${sizeClass} rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#ff8a3d] hover:text-[#ff8a3d] transition-colors`}
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] mt-1">사진 등록</span>
              </>
            )}
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
