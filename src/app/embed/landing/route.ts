// 외부 임베드 (아임웹 등) 전용 랜딩 HTML 서빙 라우트
//
// URL: GET /embed/landing
//
// 정책:
//   · iframe 임베드 → 정상 노출 (CSP frame-ancestors *)
//   · 직접 브라우저 진입 → 안내 페이지로 차단 (Sec-Fetch-Dest === 'document')
//
// 호스팅 위치는 본 Next.js 앱 (moso-rho.vercel.app) 이고,
// landing.html 은 같은 폴더에 두어 Vercel 트레이싱이 자동 포함하도록 함.

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 모듈 초기화 시점에 한 번만 읽기 (Vercel 함수 콜드 스타트 시 1회)
const LANDING_HTML_PATH = path.join(process.cwd(), "src/app/embed/landing/landing.html");
let cachedHtml: string | null = null;
function loadHtml(): string {
  if (cachedHtml) return cachedHtml;
  cachedHtml = fs.readFileSync(LANDING_HTML_PATH, "utf-8");
  return cachedHtml;
}

const BLOCKED_PAGE = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>접근할 수 없는 페이지입니다</title>
<style>
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: #fff8f1;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', sans-serif;
    color: #1f2937;
    text-align: center;
    padding: 24px;
  }
  .box {
    max-width: 420px;
    background: #fff;
    border: 1px solid #ffd9c2;
    border-radius: 22px;
    padding: 40px 28px;
    box-shadow: 0 18px 50px rgba(255,138,61,0.12);
  }
  .icon {
    width: 64px; height: 64px;
    margin: 0 auto 18px;
    border-radius: 50%;
    background: #fff4ec;
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
  }
  h1 { font-size: 20px; font-weight: 800; margin: 0 0 10px; color: #111827; }
  p { font-size: 14.5px; line-height: 1.7; color: #4b5563; margin: 0 0 22px; }
  a {
    display: inline-block;
    padding: 12px 24px;
    background: #ff8a3d;
    color: #fff;
    border-radius: 12px;
    font-size: 14.5px;
    font-weight: 700;
    text-decoration: none;
  }
</style>
</head><body>
<div class="box">
  <div class="icon">🔒</div>
  <h1>임베드 전용 페이지입니다</h1>
  <p>이 페이지는 직접 접근할 수 없습니다.<br />
  서비스를 이용하시려면 메인 사이트로 이동해주세요.</p>
  <a href="https://moso-rho.vercel.app/">MOSO 메인으로 가기 →</a>
</div>
</body></html>`;

export async function GET(req: NextRequest) {
  // Sec-Fetch-Dest: 브라우저가 요청 종류를 알려줌
  //   · 'document'  → 주소창에 직접 입력 / 새 탭 / 일반 네비게이션
  //   · 'iframe'    → <iframe> 안에서 로드
  //   · 'embed'     → <embed> 안에서 로드
  //   · null/empty  → 구식 브라우저 (요즘 거의 없음, 안전상 차단)
  const dest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  const isIframe = dest === "iframe" || dest === "embed" || dest === "frame" || dest === "fencedframe";

  if (!isIframe) {
    // 직접 접근 → 차단 안내 페이지
    return new NextResponse(BLOCKED_PAGE, {
      status: 403,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // CDN 이 헤더에 따라 다른 응답을 캐시하도록
        "Vary": "Sec-Fetch-Dest",
        // 자체 페이지도 다른 곳에 임베드 안 되게
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "frame-ancestors 'none'",
      },
    });
  }

  // iframe 임베드 → 정상 응답
  return new NextResponse(loadHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // CDN 이 Sec-Fetch-Dest 헤더 별로 다른 응답을 캐시 (직접 접근 차단을 캐시가 우회하지 못하게)
      "Vary": "Sec-Fetch-Dest",
      // 어떤 도메인이든 iframe 임베드 허용 (아임웹 도메인 변동성 대응)
      // 만약 특정 도메인만 허용하고 싶으면 아래를 다음으로 변경:
      //   "Content-Security-Policy": "frame-ancestors https://*.imweb.me https://imweb.me https://your-domain.com"
      "Content-Security-Policy": "frame-ancestors *",
      "X-Frame-Options": "ALLOWALL",
      // CDN 캐시 5분 + SWR 1시간 (Vary 와 함께 헤더별로 분리 캐싱)
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
