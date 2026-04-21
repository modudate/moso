type Props = { count?: number };

export default function ProfileCardSkeleton({ count = 6 }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 py-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden">
          <div className="relative aspect-[9/16] bg-gray-200 overflow-hidden animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-300/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
              <div className="h-4 w-1/2 bg-white/60 rounded" />
              <div className="h-3 w-1/3 bg-white/50 rounded" />
              <div className="flex gap-1">
                <div className="h-3 w-10 bg-white/40 rounded-full" />
                <div className="h-3 w-12 bg-white/40 rounded-full" />
                <div className="h-3 w-8 bg-white/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
