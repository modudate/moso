"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BIRTH_YEARS, GENDERS, CITIES, DISTRICTS, EDUCATIONS,
  JOB_TYPES, SALARIES, SMOKING, MBTI_TYPES, PRIORITIES,
} from "@/lib/options";

interface StepConfig {
  key: string;
  title: string;
  subtitle?: string;
  type: "text" | "select" | "phone" | "image" | "email" | "password" | "number" | "city-district";
  options?: string[];
  placeholder?: string;
}

const STEPS: StepConfig[] = [
  { key: "email", title: "이메일을 입력해주세요", subtitle: "로그인에 사용됩니다.", type: "email", placeholder: "example@email.com" },
  { key: "password", title: "비밀번호를 설정해주세요", type: "password", placeholder: "4자리 이상" },
  { key: "image", title: "프로필 사진을 등록해주세요!", subtitle: "이성에게 공개됩니다.", type: "image" },
  { key: "name", title: "성함을 알려주세요!", type: "text", placeholder: "홍길동" },
  { key: "gender", title: "성별을 선택해주세요!", type: "select", options: [...GENDERS] },
  { key: "birthYear", title: "출생년도를 알려주세요!", type: "select", options: BIRTH_YEARS },
  { key: "region", title: "거주지를 선택해주세요!", type: "city-district" },
  { key: "education", title: "학력을 알려주세요!", subtitle: "이성에게 공개됩니다.", type: "select", options: EDUCATIONS },
  { key: "height", title: "키를 알려주세요! (cm)", subtitle: "이성에게 공개됩니다.", type: "number", placeholder: "178" },
  { key: "job", title: "직무를 알려주세요!", subtitle: "이성에게 공개됩니다.", type: "text", placeholder: "공무원_행정직, IT회사_개발자" },
  { key: "jobType", title: "직업 형태를 선택해주세요!", subtitle: "이성에게 공개됩니다.", type: "select", options: JOB_TYPES },
  { key: "salary", title: "연봉을 알려주세요!", subtitle: "이성에게 공개됩니다.", type: "select", options: SALARIES },
  { key: "smoking", title: "흡연을 하시나요?", subtitle: "이성에게 공개됩니다.", type: "select", options: SMOKING },
  { key: "mbti", title: "MBTI를 알려주세요!", subtitle: "이성에게 공개됩니다.", type: "select", options: MBTI_TYPES },
  { key: "charm", title: "매력포인트를 알려주세요!", subtitle: "이성에게 공개됩니다.", type: "text", placeholder: "예: 유머감각이 좋아요" },
  { key: "datingStyle", title: "연애스타일을 알려주세요!", subtitle: "이성에게 공개됩니다.", type: "text", placeholder: "예: 매일 연락하는 스타일" },
  { key: "phone", title: "연락처를 알려주세요.", subtitle: "비상 시 외에는 사용되지 않습니다.", type: "phone", placeholder: "01012345678" },
  { key: "idealHeight", title: "이상형의 키를 선택해주세요!", subtitle: "이상형 정보 입력", type: "select", options: ["151 ~ 155","156 ~ 160","161 ~ 165","166 ~ 170","171 ~ 175","176 ~ 180","181 ~ 185","185 이상"] },
  { key: "idealAge", title: "이상형의 나이 범위를 선택해주세요!", subtitle: "이상형 정보 입력", type: "select", options: ["2006년 ~ 1997년","1996년 ~ 1994년","1993년 ~ 1990년","1989년 ~ 1987년","1986년 ~ 1984년","1983년 ~ 1981년"] },
  { key: "idealRegion", title: "이상형의 거주지를 선택해주세요!", subtitle: "이상형 정보 입력", type: "city-district" },
  { key: "idealSmoking", title: "이상형의 흡연여부를 선택해주세요!", subtitle: "이상형 정보 입력", type: "select", options: SMOKING },
  { key: "idealEducation", title: "이상형의 학력을 선택해주세요!", subtitle: "이상형 정보 입력", type: "select", options: EDUCATIONS },
  { key: "idealJobType", title: "이상형의 직업 형태를 선택해주세요!", subtitle: "이상형 정보 입력", type: "select", options: JOB_TYPES },
  { key: "idealSalary", title: "이상형의 연봉을 선택해주세요!", subtitle: "이상형 정보 입력", type: "select", options: SALARIES },
  { key: "priority", title: "가장 중요한 우선순위를 선택해주세요!", type: "select", options: PRIORITIES },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;
  const isIdealSection = step >= 17;

  const setValue = (val: string) => setFormData((p) => ({ ...p, [current.key]: val }));

  const canNext = () => {
    const v = formData[current.key]?.trim();
    if (!v) return current.type === "image";
    if (current.type === "email") return v.includes("@");
    if (current.type === "password") return v.length >= 4;
    if (current.type === "city-district") return !!formData[current.key + "_city"];
    return true;
  };

  const next = () => { if (step < totalSteps - 1) setStep(s => s + 1); else handleSubmit(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setValue(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        action: "register",
        email: formData.email,
        password: formData.password,
        image: formData.image || "",
        name: formData.name,
        gender: formData.gender,
        birthYear: formData.birthYear,
        city: formData.region_city || "",
        district: formData.region_district || "",
        education: formData.education,
        height: formData.height,
        job: formData.job,
        jobType: formData.jobType,
        salary: formData.salary,
        smoking: formData.smoking,
        mbti: formData.mbti,
        charm: formData.charm,
        datingStyle: formData.datingStyle,
        phone: formData.phone,
        idealHeight: formData.idealHeight,
        idealAge: formData.idealAge,
        idealCity: formData.idealRegion_city || "",
        idealDistrict: formData.idealRegion_district || "",
        idealSmoking: formData.idealSmoking,
        idealEducation: formData.idealEducation,
        idealJobType: formData.idealJobType,
        idealSalary: formData.idealSalary,
        priority: formData.priority,
      };
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) setDone(true);
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-white px-4">
        <div className="bg-card rounded-3xl shadow-xl p-10 text-center space-y-6 max-w-md w-full">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold">회원가입이 완료되었습니다!</h2>
          <p className="text-muted-fg">관리자 승인 후 서비스 이용이 가능합니다.</p>
          <button onClick={() => router.push("/login")} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
            로그인 페이지로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light via-background to-white flex flex-col">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={prev} disabled={step === 0} className="text-muted-fg hover:text-foreground disabled:opacity-30 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
          <span className="text-sm font-medium text-muted-fg whitespace-nowrap">{step + 1} / {totalSteps}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            {isIdealSection && <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full mb-2">이상형 정보</span>}
            <h2 className="text-2xl sm:text-3xl font-bold">{current.title}</h2>
            {current.subtitle && <p className="text-muted-fg text-sm">{current.subtitle}</p>}
          </div>

          <div className="space-y-4">
            {current.type === "image" && (
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-full border-3 border-dashed border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-white overflow-hidden">
                  {formData.image ? <img src={formData.image} alt="" className="w-full h-full object-cover" /> :
                    <div className="text-center text-muted-fg"><svg className="w-10 h-10 mx-auto mb-1 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg><span className="text-xs">사진 업로드</span></div>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            )}
            {(current.type === "text" || current.type === "email" || current.type === "password" || current.type === "number") && (
              <input type={current.type === "number" ? "number" : current.type} value={formData[current.key] || ""} onChange={(e) => setValue(e.target.value)} placeholder={current.placeholder}
                className="w-full px-6 py-4 rounded-2xl border border-border bg-white text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && canNext() && next()} />
            )}
            {current.type === "phone" && (
              <input type="tel" value={formData[current.key] || ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); if (v.length <= 11) setValue(v); }} placeholder={current.placeholder}
                className="w-full px-6 py-4 rounded-2xl border border-border bg-white text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary tracking-widest"
                onKeyDown={(e) => e.key === "Enter" && canNext() && next()} />
            )}
            {current.type === "select" && current.options && (
              <div className={`grid gap-3 ${current.options.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                {current.options.map((opt) => (
                  <button key={opt} onClick={() => { setValue(opt); setTimeout(() => { if (step < totalSteps - 1) setStep(s => s + 1); else handleSubmit(); }, 200); }}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${formData[current.key] === opt ? "bg-primary text-white border-primary shadow-md scale-[1.02]" : "bg-white text-foreground border-border hover:border-primary/40 hover:bg-primary-light/50"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {current.type === "city-district" && (
              <CityDistrictPicker keyPrefix={current.key} formData={formData} setFormData={setFormData} onComplete={() => { if (step < totalSteps - 1) setStep(s => s + 1); else handleSubmit(); }} />
            )}
          </div>

          {current.type !== "select" && current.type !== "city-district" && (
            <div className="flex justify-center">
              <button onClick={next} disabled={!canNext() || submitting}
                className="px-10 py-4 bg-primary text-white rounded-2xl font-semibold text-lg hover:bg-primary-dark transition-all disabled:opacity-40 shadow-lg hover:shadow-xl">
                {submitting ? "등록 중..." : step === totalSteps - 1 ? "가입 완료" : "다음"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function CityDistrictPicker({ keyPrefix, formData, setFormData, onComplete }: {
  keyPrefix: string; formData: Record<string, string>; setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>; onComplete: () => void;
}) {
  const city = formData[keyPrefix + "_city"] || "";
  const district = formData[keyPrefix + "_district"] || "";
  const districts = city ? (DISTRICTS[city] || []) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CITIES.map((c) => (
          <button key={c} onClick={() => {
            setFormData(p => ({ ...p, [keyPrefix + "_city"]: c, [keyPrefix + "_district"]: "", [keyPrefix]: c }));
            if (!DISTRICTS[c]?.length) setTimeout(onComplete, 200);
          }}
            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${city === c ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary/40"}`}>
            {c}
          </button>
        ))}
      </div>
      {districts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {districts.map((d) => (
            <button key={d} onClick={() => {
              setFormData(p => ({ ...p, [keyPrefix + "_district"]: d, [keyPrefix]: `${city} ${d}` }));
              setTimeout(onComplete, 200);
            }}
              className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${district === d ? "bg-accent text-white border-accent" : "bg-white text-foreground border-border hover:border-accent/40"}`}>
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
