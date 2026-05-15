// 카카오톡/페이스북/인스타그램/라인/네이버 등 인앱 브라우저 감지 + 외부 브라우저 강제 열기 헬퍼
//
// 배경: Google OAuth 는 보안 정책상 인앱 WebView 로그인을 차단(403 disallowed_useragent).
//   - Android: intent:// URL 로 Chrome 강제 실행 가능 (사용자 액션 1회)
//   - iOS    : Apple 정책상 외부 브라우저 강제 열기 API 없음 → 안내만 가능

export type InAppKind = "kakaotalk" | "facebook" | "instagram" | "line" | "naver" | "other" | null;

export function detectInAppBrowser(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): InAppKind {
  if (!ua) return null;
  const u = ua.toLowerCase();
  if (u.includes("kakaotalk")) return "kakaotalk";
  if (u.includes("fban") || u.includes("fbav") || u.includes("fb_iab")) return "facebook";
  if (u.includes("instagram")) return "instagram";
  if (u.includes("line/")) return "line";
  if (u.includes("naver")) return "naver";
  // 기타 인앱 휴리스틱: webview 토큰
  if (u.includes("; wv)")) return "other";
  return null;
}

export function isAndroid(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  return /android/i.test(ua);
}

export function isIOS(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  return /iphone|ipad|ipod/i.test(ua);
}

// Android Intent URL 로 Chrome 강제 오픈
//   현재 페이지(또는 지정 URL)를 Chrome 으로 다시 연다.
export function openInExternalAndroid(targetUrl?: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(targetUrl ?? window.location.href);
  const hostAndPath = `${url.host}${url.pathname}${url.search}${url.hash}`;
  // intent://moso-rho.vercel.app/...#Intent;scheme=https;package=com.android.chrome;end
  const intent = `intent://${hostAndPath}#Intent;scheme=${url.protocol.replace(":", "")};package=com.android.chrome;end`;
  window.location.href = intent;
}

// 카카오톡 인앱일 때만 카카오 자체 외부 브라우저 스킴이 동작 (kakaotalk://web/openExternal)
export function openInExternalKakao(targetUrl?: string): void {
  if (typeof window === "undefined") return;
  const url = targetUrl ?? window.location.href;
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}
