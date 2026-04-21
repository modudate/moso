"use client";

interface Props {
  cols: 1 | 2;
  onChange: (v: 1 | 2) => void;
}

export default function GridToggle({ cols, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`p-2 transition-colors ${cols === 1 ? "bg-[#ff8a3d] text-white" : "text-muted-fg hover:bg-gray-50"}`}
        aria-label="1줄에 1개 보기"
        title="1줄에 1개">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange(2)}
        className={`p-2 transition-colors ${cols === 2 ? "bg-[#ff8a3d] text-white" : "text-muted-fg hover:bg-gray-50"}`}
        aria-label="1줄에 2개 보기"
        title="1줄에 2개">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="8" height="16" rx="1.5" />
          <rect x="13" y="4" width="8" height="16" rx="1.5" />
        </svg>
      </button>
    </div>
  );
}
