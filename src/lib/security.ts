import sanitizeHtml from "sanitize-html";

// XSS 방지: 자유 텍스트 필드 새니타이징
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

// 전화번호 형식 검증
export function isValidPhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone);
}

// 키 범위 검증
export function isValidHeight(height: number): boolean {
  return Number.isInteger(height) && height >= 130 && height <= 230;
}

// 출생년도 범위 검증
export function isValidBirthYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1950 && year <= 2010;
}

// Rate Limit 키 생성
export function getRateLimitKey(ip: string, action: string): string {
  return `rl:${action}:${ip}`;
}

// Generic 에러 응답 (프로덕션에서 내부 정보 노출 방지)
export function safeError(message: string, status: number = 500) {
  if (process.env.NODE_ENV === "production") {
    return { error: "요청을 처리할 수 없습니다", status };
  }
  return { error: message, status };
}
