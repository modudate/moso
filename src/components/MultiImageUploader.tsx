"use client";

import { useState, useRef } from "react";

interface MultiImageUploaderProps {
  values: string[];
  maxCount: number;
  category: "photo";
  onChanged: (paths: string[], urls: string[]) => void;
  label?: string;
}

export default function MultiImageUploader({ values, maxCount, category, onChanged, label }: MultiImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(values);
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (urls.length >= maxCount) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        const newUrls = [...urls, data.signedUrl];
        const newPaths = [...paths, data.path];
        setUrls(newUrls);
        setPaths(newPaths);
        onChanged(newPaths, newUrls);
      } else {
        alert(data.error || "업로드 실패");
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    const newPaths = paths.filter((_, i) => i !== index);
    setUrls(newUrls);
    setPaths(newPaths);
    onChanged(newPaths, newUrls);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

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
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {urls.length < maxCount && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#ff8a3d] hover:text-[#ff8a3d] transition-colors flex-shrink-0"
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] mt-1">{urls.length === 0 ? "대표 사진" : "추가"}</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">{urls.length}/{maxCount}장 (JPEG, PNG, WebP · 5MB 이하)</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
