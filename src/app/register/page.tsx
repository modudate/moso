"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GENDERS, BIRTH_YEARS, CITIES, DISTRICTS, EDUCATIONS, WORKPLACES, JOBS,
  WORK_PATTERNS, SALARIES, SMOKING_OPTIONS, MBTI_TYPES, AGE_RANGES,
  HEIGHT_RANGES, TOP_PRIORITIES,
} from "@/lib/options";
import MultiImageUploader from "@/components/MultiImageUploader";
import ImageUploader from "@/components/ImageUploader";

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [height, setHeight] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [job, setJob] = useState("");
  const [workPattern, setWorkPattern] = useState("");
  const [salary, setSalary] = useState("");
  const [education, setEducation] = useState("");
  const [smoking, setSmoking] = useState("");
  const [mbti, setMbti] = useState("");
  const [charm, setCharm] = useState("");
  const [datingStyle, setDatingStyle] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [charmPhotoUrl, setCharmPhotoUrl] = useState<string | null>(null);
  const [datePhotoUrl, setDatePhotoUrl] = useState<string | null>(null);

  const [idealAge, setIdealAge] = useState("");
  const [idealMinHeight, setIdealMinHeight] = useState("");
  const [idealMaxHeight, setIdealMaxHeight] = useState("");
  const [idealCities, setIdealCities] = useState<string[]>([]);
  const [idealWorkplaces, setIdealWorkplaces] = useState<string[]>([]);
  const [idealSalaries, setIdealSalaries] = useState<string[]>([]);
  const [idealEducation, setIdealEducation] = useState<string[]>([]);
  const [idealSmoking, setIdealSmoking] = useState("");
  const [idealMbti, setIdealMbti] = useState<string[]>([]);
  const [topPriorities, setTopPriorities] = useState<string[]>([]);

  const [error, setError] = useState("");

  const districtOptions = DISTRICTS[city] || [];
  const jobOptions = JOBS[workplace] || [];

  const toggleMulti = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const togglePriority = (val: string) => {
    if (topPriorities.includes(val)) {
      setTopPriorities(topPriorities.filter(v => v !== val));
    } else if (topPriorities.length < 4) {
      setTopPriorities([...topPriorities, val]);
    }
  };

  const validateStep1 = () => {
    if (!realName.trim()) return "본명을 입력해주세요";
    if (!nickname.trim()) return "닉네임을 입력해주세요";
    if (!gender) return "성별을 선택해주세요";
    if (!birthYear) return "출생년도를 선택해주세요";
    if (!height || isNaN(Number(height)) || Number(height) < 130 || Number(height) > 230) return "키를 정확히 입력해주세요 (130~230)";
    if (!/^010-\d{4}-\d{4}$/.test(phone)) return "전화번호를 올바르게 입력해주세요 (010-0000-0000)";
    if (!city) return "거주지(시/도)를 선택해주세요";
    if (districtOptions.length > 0 && !district) return "거주지(구역)를 선택해주세요";
    if (!workplace) return "직장을 선택해주세요";
    if (jobOptions.length > 0 && !job) return "직업을 선택해주세요";
    if (!workPattern) return "근무패턴을 선택해주세요";
    if (!salary) return "연봉을 선택해주세요";
    if (!education) return "학력을 선택해주세요";
    if (!smoking) return "흡연 여부를 선택해주세요";
    if (!mbti) return "MBTI를 선택해주세요";
    if (!charm.trim()) return "매력을 입력해주세요";
    if (!datingStyle.trim()) return "연애스타일을 입력해주세요";
    return "";
  };

  const validateStep2 = () => {
    if (!idealAge) return "선호 나이를 선택해주세요";
    if (!idealMinHeight || !idealMaxHeight) return "선호 키 범위를 입력해주세요";
    if (Number(idealMinHeight) > Number(idealMaxHeight)) return "선호 키: 최소가 최대보다 클 수 없습니다";
    if (idealCities.length === 0) return "선호 거주지를 1개 이상 선택해주세요";
    if (idealWorkplaces.length === 0) return "선호 직장을 1개 이상 선택해주세요";
    if (idealSalaries.length === 0) return "선호 연봉을 1개 이상 선택해주세요";
    if (idealEducation.length === 0) return "선호 학력을 1개 이상 선택해주세요";
    if (!idealSmoking) return "선호 흡연여부를 선택해주세요";
    if (idealMbti.length === 0) return "선호 MBTI를 1개 이상 선택해주세요";
    if (topPriorities.length !== 4) return "최애 포인트를 정확히 4개 선택해주세요";
    return "";
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError("");

    const body = {
      realName: realName.trim(),
      nickname: nickname.trim(),
      role: gender === "남" ? "male" : "female",
      birthYear: parseInt(birthYear),
      height: parseInt(height),
      phone,
      city,
      district: district || "",
      workplace,
      job: job || workplace,
      workPattern,
      salary,
      education,
      smoking: smoking === "유",
      mbti,
      charm: charm.trim(),
      datingStyle: datingStyle.trim(),
      idealType: {
        idealAge,
        idealMinHeight: parseInt(idealMinHeight),
        idealMaxHeight: parseInt(idealMaxHeight),
        idealCities,
        idealWorkplaces,
        idealJobs: [],
        idealSalaries,
        idealEducation,
        idealSmoking: idealSmoking === "상관없음" ? null : idealSmoking === "비흡연",
        idealMbti,
        topPriorities,
      },
    };

    const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const endpoint = useSupabase ? "/api/register" : "/api/profiles";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/register/complete");
    } else {
      const data = await res.json();
      setError(data.error || "등록에 실패했습니다");
    }
  };

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50" style={{ backgroundColor: "#ff8a3d" }}>
        <div className="max-w-[430px] mx-auto px-5 py-4 flex items-center gap-3">
          {step === 2 ? (
            <button onClick={() => { setStep(1); setError(""); window.scrollTo(0, 0); }} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          ) : (
            <button onClick={() => router.push("/")} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-white flex-1">회원가입</h1>
          <span className="text-white/70 text-sm">{step} / 2</span>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-5 py-6">
        <div className="flex gap-1 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#ff8a3d" }} />
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: step === 2 ? "#ff8a3d" : "#e5e5e5" }} />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">프로필 기본 정보</h2>
            <p className="text-sm text-muted-fg -mt-3">모든 항목 필수 입력</p>

            <Field label="본명">
              <input type="text" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="실명을 입력해주세요"
                className="input-field" />
            </Field>

            <Field label="닉네임">
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="이성에게 보여질 닉네임"
                className="input-field" />
            </Field>

            <Field label="성별">
              <div className="flex gap-3">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${gender === g ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={gender === g ? { backgroundColor: "#ff8a3d" } : {}}>
                    {g === "남" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="출생년도">
              <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>

            <Field label="키 (cm)">
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="130 ~ 230" min={130} max={230}
                className="input-field" />
            </Field>

            <Field label="전화번호">
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000"
                className="input-field" />
              <p className="text-xs text-muted-fg mt-1">연락처는 비상시 외에는 절대 사용되지 않습니다</p>
            </Field>

            <Field label="거주지">
              <div className="flex gap-3">
                <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }} className="input-field flex-1">
                  <option value="">시/도</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {districtOptions.length > 0 && (
                  <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field flex-1">
                    <option value="">구역</option>
                    {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
            </Field>

            <Field label="직장">
              <select value={workplace} onChange={(e) => { setWorkplace(e.target.value); setJob(""); }} className="input-field">
                <option value="">선택해주세요</option>
                {WORKPLACES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>

            {jobOptions.length > 0 && (
              <Field label="직업">
                <select value={job} onChange={(e) => setJob(e.target.value)} className="input-field">
                  <option value="">선택해주세요</option>
                  {jobOptions.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </Field>
            )}

            <Field label="근무패턴">
              <select value={workPattern} onChange={(e) => setWorkPattern(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {WORK_PATTERNS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>

            <Field label="연봉">
              <select value={salary} onChange={(e) => setSalary(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {SALARIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="학력">
              <select value={education} onChange={(e) => setEducation(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {EDUCATIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>

            <Field label="흡연">
              <div className="flex gap-3">
                {SMOKING_OPTIONS.map(s => (
                  <button key={s} onClick={() => setSmoking(s)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${smoking === s ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={smoking === s ? { backgroundColor: "#ff8a3d" } : {}}>
                    {s === "유" ? "흡연" : "비흡연"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="MBTI">
              <div className="grid grid-cols-4 gap-2">
                {MBTI_TYPES.map(m => (
                  <button key={m} onClick={() => setMbti(m)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${mbti === m ? "text-white shadow-md" : "bg-gray-100 text-gray-500"} ${m === "잘 모르겠어요" ? "col-span-2" : ""}`}
                    style={mbti === m ? { backgroundColor: "#ff8a3d" } : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="저의 매력은">
              <textarea value={charm} onChange={(e) => { if (e.target.value.length <= 200) setCharm(e.target.value); }}
                placeholder="본인의 매력포인트를 자유롭게 적어주세요" rows={3} maxLength={200}
                className="input-field resize-none" />
              <span className="text-xs text-muted-fg">{charm.length}/200자</span>
            </Field>

            <Field label="연인이 생기면 하고 싶은 일은">
              <textarea value={datingStyle} onChange={(e) => { if (e.target.value.length <= 200) setDatingStyle(e.target.value); }}
                placeholder="연애스타일을 자유롭게 적어주세요" rows={3} maxLength={200}
                className="input-field resize-none" />
              <span className="text-xs text-muted-fg">{datingStyle.length}/200자</span>
            </Field>

            <div className="pt-2 space-y-5 border-t border-gray-200">
              <MultiImageUploader
                values={photoUrls}
                maxCount={4}
                category="photo"
                onChanged={(_paths, urls) => setPhotoUrls(urls)}
                label="대표 사진 (최대 4장)"
              />

              <ImageUploader
                value={charmPhotoUrl}
                category="charm"
                onUploaded={(_path, url) => setCharmPhotoUrl(url)}
                onRemove={() => setCharmPhotoUrl(null)}
                label="저의 매력은 사진 (1장)"
              />

              <ImageUploader
                value={datePhotoUrl}
                category="date"
                onUploaded={(_path, url) => setDatePhotoUrl(url)}
                onRemove={() => setDatePhotoUrl(null)}
                label="연인이 생기면 사진 (1장)"
              />
            </div>

            <button onClick={handleNext}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: "#ff8a3d" }}>
              다음 →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">이상형 정보</h2>
            <p className="text-sm text-muted-fg -mt-3">모든 항목 필수 입력</p>

            <Field label="선호 나이">
              <select value={idealAge} onChange={(e) => setIdealAge(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>

            <Field label="선호 키 (cm)">
              <div className="flex items-center gap-3">
                <input type="number" value={idealMinHeight} onChange={(e) => setIdealMinHeight(e.target.value)} placeholder="최소" min={130} max={230}
                  className="input-field flex-1" />
                <span className="text-muted-fg font-medium">~</span>
                <input type="number" value={idealMaxHeight} onChange={(e) => setIdealMaxHeight(e.target.value)} placeholder="최대" min={130} max={230}
                  className="input-field flex-1" />
              </div>
            </Field>

            <Field label="선호 거주지 (복수 선택)">
              <div className="flex flex-wrap gap-2">
                {CITIES.map(c => (
                  <button key={c} onClick={() => toggleMulti(idealCities, c, setIdealCities)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${idealCities.includes(c) ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={idealCities.includes(c) ? { backgroundColor: "#ff8a3d" } : {}}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="선호 직장 (복수 선택)">
              <div className="flex flex-wrap gap-2">
                {WORKPLACES.map(w => (
                  <button key={w} onClick={() => toggleMulti(idealWorkplaces, w, setIdealWorkplaces)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${idealWorkplaces.includes(w) ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={idealWorkplaces.includes(w) ? { backgroundColor: "#ff8a3d" } : {}}>
                    {w}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="선호 연봉 (복수 선택)">
              <div className="flex flex-wrap gap-2">
                {SALARIES.map(s => (
                  <button key={s} onClick={() => toggleMulti(idealSalaries, s, setIdealSalaries)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${idealSalaries.includes(s) ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={idealSalaries.includes(s) ? { backgroundColor: "#ff8a3d" } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="선호 학력 (복수 선택)">
              <div className="flex flex-wrap gap-2">
                {EDUCATIONS.map(e => (
                  <button key={e} onClick={() => toggleMulti(idealEducation, e, setIdealEducation)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${idealEducation.includes(e) ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={idealEducation.includes(e) ? { backgroundColor: "#ff8a3d" } : {}}>
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="선호 흡연여부">
              <div className="flex gap-3">
                {["비흡연", "상관없음"].map(s => (
                  <button key={s} onClick={() => setIdealSmoking(s)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${idealSmoking === s ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={idealSmoking === s ? { backgroundColor: "#ff8a3d" } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="선호 MBTI (복수 선택)">
              <div className="grid grid-cols-4 gap-2">
                {MBTI_TYPES.map(m => (
                  <button key={m} onClick={() => toggleMulti(idealMbti, m, setIdealMbti)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${idealMbti.includes(m) ? "text-white shadow-md" : "bg-gray-100 text-gray-500"} ${m === "잘 모르겠어요" ? "col-span-2" : ""}`}
                    style={idealMbti.includes(m) ? { backgroundColor: "#ff8a3d" } : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={`나의 최애 포인트 (${topPriorities.length}/4 선택)`}>
              <p className="text-xs text-muted-fg mb-2">가장 중요하게 생각하는 4가지를 선택해주세요</p>
              <div className="grid grid-cols-4 gap-2">
                {TOP_PRIORITIES.map(p => {
                  const selected = topPriorities.includes(p);
                  const idx = topPriorities.indexOf(p);
                  const disabled = !selected && topPriorities.length >= 4;
                  return (
                    <button key={p} onClick={() => togglePriority(p)} disabled={disabled}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all relative ${selected ? "text-white shadow-md" : disabled ? "bg-gray-100 text-gray-300" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                      style={selected ? { backgroundColor: "#ff8a3d" } : {}}>
                      {selected && <span className="absolute top-1 right-2 text-[10px] font-bold text-white/80">{idx + 1}</span>}
                      {p}
                    </button>
                  );
                })}
              </div>
            </Field>

            <button onClick={handleSubmit}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: "#ff8a3d" }}>
              가입 신청하기
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #e5e5e5;
          background: white;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: #ff8a3d;
          box-shadow: 0 0 0 3px rgba(255,138,61,0.1);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">{label}</label>
      {children}
    </div>
  );
}
