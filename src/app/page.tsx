import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white">
      <div className="text-center space-y-8 px-6">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            OUR<span className="text-primary">MO</span>
          </h1>
          <p className="text-muted-fg text-lg">당신의 특별한 만남을 위한 프로필 관리</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-primary text-white rounded-2xl font-semibold text-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            프로필 등록하기
          </Link>
          <Link
            href="/admin"
            className="px-8 py-4 bg-card text-foreground rounded-2xl font-semibold text-lg border border-border hover:border-primary/30 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            관리자 페이지
          </Link>
        </div>
        <p className="text-sm text-muted-fg/60">DEMO VERSION</p>
      </div>
    </main>
  );
}
