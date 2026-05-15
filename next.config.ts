import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // /embed/landing 의 landing.html 파일을 Vercel 함수 번들에 강제 포함
  // (fs.readFileSync 로 동적 읽기 시 트레이싱 누락 방지)
  outputFileTracingIncludes: {
    "/embed/landing": ["./src/app/embed/landing/landing.html"],
  },

  async headers() {
    return [
      {
        // /embed/landing 은 iframe 임베드 전용이므로 X-Frame-Options 제외
        // (해당 라우트 내부에서 직접 헤더 설정)
        source: "/((?!embed/landing).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // /embed/landing 에는 nosniff/referrer 만 적용 (X-Frame-Options 는 라우트에서 명시)
        source: "/embed/landing",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
