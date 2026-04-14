"use client";

import { useState, useRef, useCallback } from "react";

interface MultiImageUploaderProps {
  values: string[];
  maxCount: number;
  category: "photo";
  onChanged: (paths: string[], urls: string[]) => void;
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

export default function MultiImageUploader({ values, maxCount, category, onChanged, label }: MultiImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(values);
  const [paths, setPaths] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadOne = useCallback(async (file: File): Promise<{ path: string; url: string } | null> => {
    try {
      const resized = await resizeImage(file, 1200, 1600, 0.85);
      const formData = new FormData();
      formData.append("file", new File([resized], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
      formData.append("category", category);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) return { path: data.path, url: data.signedUrl };
      console.error(data.error);
      return null;
    } catch {
      return null;
    }
  }, [category]);

  const handleFiles = useCallback(async (files: File[]) => {
    const remaining = maxCount - urls.length;
    if (remaining <= 0) return;

    const toUpload = files.slice(0, remaining);
    setUploadingCount(toUpload.length);

    const results = await Promise.all(toUpload.map(uploadOne));

    const successes = results.filter((r): r is { path: string; url: string } => r !== null);
    if (successes.length === 0) {
      alert("업로드에 실패했습니다");
      setUploadingCount(0);
      return;
    }

    const newUrls = [...urls, ...successes.map(s => s.url)];
    const newPaths = [...paths, ...successes.map(s => s.path)];
    setUrls(newUrls);
    setPaths(newPaths);
    onChanged(newPaths, newUrls);
    setUploadingCount(0);

    if (successes.length < toUpload.length) {
      alert(`${toUpload.length}장 중 ${successes.length}장만 업로드되었습니다`);
    }
  }, [urls, paths, maxCount, uploadOne, onChanged]);

  const handleRemove = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    const newPaths = paths.filter((_, i) => i !== index);
    setUrls(newUrls);
    setPaths(newPaths);
    onChanged(newPaths, newUrls);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      handleFiles(Array.from(fileList));
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fileList = e.dataTransfer.files;
    if (fileList && fileList.length > 0) {
      handleFiles(Array.from(fileList));
    }
  };

  const isUploading = uploadingCount > 0;
  const slotsLeft = maxCount - urls.length;

  return (
    <div>
      {label && <p className="text-sm font-semibold mb-2">{label}</p>}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {urls.map((url, i) => (
          <div key={i} className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100">
              <img src={url} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
            </div>
            <span className="absolute top-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">{i + 1}</span>
            <button
              onClick={() => handleRemove(i)}
              disabled={isUploading}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {isUploading && Array.from({ length: uploadingCount }).map((_, i) => (
          <div key={`uploading-${i}`} className="w-28 h-28 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <div className="w-6 h-6 border-2 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
          </div>
        ))}
        {!isUploading && slotsLeft > 0 && (
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
      <p className="text-xs text-gray-400 mt-1">{urls.length}/{maxCount}장 · 여러 장 동시 선택 가능</p>
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
