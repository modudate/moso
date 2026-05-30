// 카카오톡/페이스북/인스타그램/라인/네이버 등 인앱 브라우저 감지 + 외부 브라우저 강제 열기 헬퍼
//
// 배경: Google OAuth 는 보안 정책상 인앱 WebView 로그인을 차단(403 disallowed_useragent).
//   - Android: intent:// URL 로 Chrome 강제 실행 가능 (사용자 액션 1회)
//   - iOS    : Apple 정책상 외부 브라우저 강제 열기 API 없음 → 안내만 가능

export type InAppKind = "kakaotalk" | "facebook" | "instagram" | "line" | "naver" | "other" | null;

export function detectInAppBrowser(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): InAppKind {
  if (!ua) return null;
  const u = ua.toLowerCase();

  // ── 1) 앱별로 식별 가능한 인앱 (외부 열기 스킴이 앱마다 달라 종류 구분이 필요) ──
  if (u.includes("kakaotalk")) return "kakaotalk";
  if (u.includes("fban") || u.includes("fbav") || u.includes("fb_iab")) return "facebook";
  if (u.includes("instagram")) return "instagram";
  if (/\bline\//.test(u)) return "line";
  if (u.includes("naver")) return "naver";

  // ── 2) 기타 알려진 인앱 브라우저 (구분 없이 차단만; 종류는 other) ──
  //   네이버밴드/다음/위챗/스냅챗/트위터(X)/링크드인/틱톡/웨일앱/에브리타임/잘로 등.
  //   오픈 시 링크가 다양한 메신저·커뮤니티 앱으로 공유되므로 폭넓게 포함.
  if (
    /(daumapps|inappbrowser|\bband\b|micromessenger|wechat|snapchat|twitter|linkedinapp|musical_ly|tiktok|whale|everytimeapp|zalo|kakaostory)/.test(u)
  ) {
    return "other";
  }

  // ── 3) 안드로이드 WebView 휴리스틱 (앱 토큰이 없어도 WebView 면 차단) ──
  //   Google 공식 문서 기준:
  //     · "; wv"            → Lollipop+ WebView 표준 마커 ("; wv)" 형태가 아닐 수 있어 정규식 사용)
  //     · Android + Version/X.X + Chrome → KitKat~ WebView 의 Version/ 토큰
  //       (일반 Chrome for Android / 삼성인터넷 정상 UA 에는 Version/ 토큰이 없음 → 오탐 없음)
  if (/android/.test(u)) {
    if (/;\s*wv\b/.test(u)) return "other";
    if (/\bversion\/\d+\.\d+/.test(u) && /chrome\//.test(u)) return "other";
  }

  // ── 4) iOS WebView 휴리스틱 (WKWebView 는 "Safari" 토큰이 없음) ──
  //   정상 iOS 브라우저(Safari/Chrome(CriOS)/Firefox(FxiOS)/Edge(EdgiOS))는 모두 "safari" 토큰을 포함.
  //   → "safari" 가 없는 iOS WebKit 은 인앱 WebView 로 간주.
  if (
    /(iphone|ipod|ipad)/.test(u) &&
    /applewebkit/.test(u) &&
    !/safari/.test(u) &&
    !/(crios|fxios|edgios)/.test(u)
  ) {
    return "other";
  }

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
