import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 - 모두의 모임",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">개인정보처리방침</h1>
          <Link href="/" className="text-xs text-white/80 hover:text-white">홈으로</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-sm leading-7 text-gray-800">
        <p className="text-xs text-gray-500">시행일: 2026년 3월 17일 (Placeholder — 정식 본문은 클라이언트 변호사 검토 후 교체 예정)</p>

        <p>
          모두의 모임(이하 “회사”)은 「개인정보 보호법」 등 관련 법령을 준수하며,
          회원의 개인정보 보호를 위해 다음과 같이 처리방침을 수립·공개합니다.
        </p>

        <Section title="1. 수집하는 개인정보의 항목">
          회사는 회원가입 및 서비스 제공을 위하여 아래와 같은 개인정보를 수집합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>필수: 이메일, 본명, 닉네임, 출생년도, 성별, 거주지(시/도, 구역), 학력, 키, 직장 형태, 직업, 근무 패턴, 연봉, 흡연 여부, MBTI, 매력 포인트, 연애 스타일, 전화번호, 프로필 사진(대표 최대 4장 + 매력 사진 1장 + 데이트 사진 1장)</li>
            <li>이상형 정보: 키 범위, 출생년도 범위, 거주지, 흡연 여부, 학력, 직장, 직업, 연봉, MBTI, 최애 포인트 4가지</li>
            <li>자동 수집: 서비스 이용 기록, 접속 로그, IP, 쿠키</li>
            <li>인증: Google OAuth를 통해 제공되는 이메일 및 프로필 이미지</li>
          </ul>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원 식별 및 본인 확인</li>
            <li>프로필 매칭 서비스 제공 및 운영</li>
            <li>관리자 추천(MD 추천) 등 부가 서비스 제공</li>
            <li>부정 이용 방지, 분쟁 조정, 민원 처리</li>
            <li>법령상 의무 이행</li>
          </ol>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
              <ul className="list-disc pl-5 mt-1">
                <li>계약 또는 청약 철회 등에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
                <li>로그 기록: 3개월 (통신비밀보호법)</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          회사는 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만, 매칭이 성사된 경우 매칭 상대방에게 회원이 등록한 프로필 정보가 공개되며, 본인의 사전 동의가 있거나 법령에 따른 경우에 한하여 예외적으로 제공할 수 있습니다.
        </Section>

        <Section title="5. 개인정보 처리 위탁">
          회사는 안정적인 서비스 제공을 위하여 아래와 같이 개인정보 처리 업무를 위탁합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Vercel Inc. — 웹 호스팅 및 인프라 운영</li>
            <li>Supabase Inc. — 데이터베이스, 인증, 파일 스토리지</li>
            <li>Google LLC — OAuth 인증</li>
          </ul>
        </Section>

        <Section title="6. 정보주체의 권리·의무">
          회원은 언제든지 다음 각 호의 권리를 행사할 수 있습니다.
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ol>
        </Section>

        <Section title="7. 개인정보의 파기 절차 및 방법">
          <ol className="list-decimal pl-5 space-y-1">
            <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
            <li>출력물: 분쇄 또는 소각</li>
          </ol>
        </Section>

        <Section title="8. 개인정보 보호를 위한 안전 조치">
          회사는 개인정보 보호를 위하여 다음과 같은 조치를 취하고 있습니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보 접근 권한 최소화</li>
            <li>전송 구간 암호화(HTTPS) 적용</li>
            <li>접근 기록 보관 및 위·변조 방지</li>
            <li>관리자 페이지 접근 통제</li>
          </ul>
        </Section>

        <Section title="9. 개인정보 보호 책임자">
          <ul className="list-disc pl-5 space-y-1">
            <li>책임자: (운영사 지정 예정)</li>
            <li>이메일: (운영사 지정 예정)</li>
          </ul>
        </Section>

        <Section title="10. 권익 침해 구제 방법">
          개인정보 침해로 인한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
            <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
            <li>대검찰청 사이버수사과 (www.spo.go.kr / 1301)</li>
            <li>경찰청 사이버수사국 (ecrm.cyber.go.kr / 182)</li>
          </ul>
        </Section>

        <p className="pt-6 text-xs text-gray-500">본 문서는 placeholder입니다. 실제 운영 전에 클라이언트의 변호사 검토를 거친 본문으로 교체되어야 합니다.</p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <div className="text-gray-700">{children}</div>
    </section>
  );
}
