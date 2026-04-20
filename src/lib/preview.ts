// 피드백용 미리보기 모드 감지 (랜딩의 남성/여성/관리자 버튼에서 세팅한 쿠키 기반).
// 실제 회원가입/세션 없이 UI 탐색만 할 수 있게 함. 추후 피드백 완료 후 이 파일과
// 관련 호출 부분만 제거하면 됨.
export function isPreviewMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("preview_bypass=1"));
}
