import Link from "next/link";

export const metadata = {
  title: "이용약관 - 모두의 모임",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">이용약관</h1>
          <Link href="/" className="text-xs text-white/80 hover:text-white">홈으로</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-sm leading-7 text-gray-800">
        <p className="text-xs text-gray-500">시행일: 2026년 3월 17일 (Placeholder — 정식 본문은 클라이언트 변호사 검토 후 교체 예정)</p>

        <Section title="제1조 (목적)">
          본 약관은 모두의 모임(이하 “회사”)이 제공하는 프로필 매칭 관리 서비스(이하 “서비스”)의 이용에 관하여 회사와 회원 간의 권리, 의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (용어의 정의)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>“회원”이란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
            <li>“프로필”이란 회원이 본인에 관하여 등록한 정보(사진, 닉네임, 출생년도 등)를 말합니다.</li>
            <li>“매칭”이란 회원 상호 간 프로필을 열람하고 매칭 요청을 주고받는 절차를 말합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관은 서비스 화면에 게시하거나 회원에게 통지함으로써 효력을 발생합니다.</li>
            <li>회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 사전 공지 후 효력이 발생합니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (서비스의 제공)">
          회사는 회원에게 다음과 같은 서비스를 제공합니다.
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>프로필 등록 및 열람 서비스</li>
            <li>매칭 요청 및 수락/거절 기능</li>
            <li>관리자 추천(MD 추천) 기능</li>
            <li>기타 회사가 정하는 부가 서비스</li>
          </ol>
        </Section>

        <Section title="제5조 (회원가입 및 승인)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원가입은 이용 신청자가 본 약관 및 개인정보처리방침에 동의하고 가입 신청 후, 회사의 승인을 받음으로써 완료됩니다.</li>
            <li>회사는 다음 각 호에 해당하는 경우 가입 신청을 거절하거나 사후 회원 자격을 박탈할 수 있습니다.
              <ul className="list-disc pl-5 mt-1">
                <li>허위 정보를 기재한 경우</li>
                <li>타인의 명의나 정보를 도용한 경우</li>
                <li>본 약관 또는 관련 법령을 위반한 경우</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제6조 (회원의 의무)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 본인의 정보를 정확하게 입력하고, 변경 시 즉시 수정하여야 합니다.</li>
            <li>회원은 다른 회원의 프로필을 외부에 공유하거나 무단 캡처·배포하여서는 안 됩니다.</li>
            <li>회원은 서비스 이용 과정에서 알게 된 다른 회원의 개인정보를 매칭 외 목적으로 사용해서는 안 됩니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (서비스 제한 및 차단)">
          회사는 다음 각 호의 사유 발생 시 회원의 서비스 이용을 제한 또는 차단할 수 있습니다.
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>이용 만료일이 도래한 경우</li>
            <li>본 약관 위반이 확인된 경우</li>
            <li>다른 회원의 신고로 부적절한 행위가 확인된 경우</li>
          </ol>
        </Section>

        <Section title="제8조 (회원 탈퇴)">
          회원은 언제든지 서비스 내 절차에 따라 회원 탈퇴를 요청할 수 있으며, 회사는 관련 법령에서 정한 경우를 제외하고 즉시 회원 정보를 파기하거나 익명화합니다.
        </Section>

        <Section title="제9조 (면책)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 천재지변, 통신 장애 등 불가항력으로 인한 서비스 중단에 대하여 책임을 지지 않습니다.</li>
            <li>회사는 회원 간의 만남, 교제, 분쟁 등에 대하여 어떠한 책임도 지지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (관할 법원 및 준거법)">
          본 약관과 관련한 분쟁은 대한민국 법령을 준거법으로 하며, 분쟁 발생 시 민사소송법상의 관할 법원에 제기합니다.
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
