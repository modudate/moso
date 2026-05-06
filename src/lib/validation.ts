// 클라이언트/서버 공통 검증 규칙
// - 닉네임: 영문/숫자/한글/한글 자모만, 2~10자, 특수문자·이모티콘·공백 금지
// - 소개글(charm / dating_style): 100~200자

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 10;
// 영문 대소문자, 숫자, 완성형 한글 + 자모. 그 외(공백/특수/이모지) 모두 불허.
const NICKNAME_RE = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$/;

export function validateNickname(value: string): { ok: true } | { ok: false; reason: string } {
  const v = value.trim();
  if (!v) return { ok: false, reason: "닉네임을 입력해주세요" };
  if (v.length < NICKNAME_MIN) return { ok: false, reason: `닉네임은 최소 ${NICKNAME_MIN}자 이상이어야 합니다` };
  if (v.length > NICKNAME_MAX) return { ok: false, reason: `닉네임은 최대 ${NICKNAME_MAX}자까지 가능합니다` };
  if (!NICKNAME_RE.test(v)) return { ok: false, reason: "특수문자·이모티콘·공백은 사용할 수 없습니다" };
  return { ok: true };
}

// 입력 도중에도 적용 가능한 살균 함수 (특수문자/이모티콘 제거 + 길이 cut)
export function sanitizeNicknameInput(value: string): string {
  // 정규식 외 문자 제거 후 최대 길이까지 슬라이스
  const filtered = Array.from(value).filter((ch) => /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]$/.test(ch)).join("");
  return filtered.slice(0, NICKNAME_MAX);
}

export const INTRO_MIN = 100;
export const INTRO_MAX = 200;

export function validateIntroText(value: string, label: string): { ok: true } | { ok: false; reason: string } {
  const v = value.trim();
  if (v.length < INTRO_MIN) return { ok: false, reason: `${label}은(는) 최소 ${INTRO_MIN}자 이상 작성해주세요 (현재 ${v.length}자)` };
  if (v.length > INTRO_MAX) return { ok: false, reason: `${label}은(는) 최대 ${INTRO_MAX}자까지 가능합니다` };
  return { ok: true };
}

// 전화번호 정규화 — 하이픈/공백/괄호 제거하여 숫자만 남김
export function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}
