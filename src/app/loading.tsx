export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-500">로딩 중...</p>
      </div>
    </div>
  );
}
