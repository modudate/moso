"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GENDERS, BIRTH_YEARS, CITIES, DISTRICTS, EDUCATIONS, WORKPLACES, JOBS,
  WORK_PATTERNS, SALARIES, SMOKING_OPTIONS, MBTI_TYPES, AGE_RANGES,
  HEIGHT_RANGES, TOP_PRIORITIES,
} from "@/lib/options";
import MultiImageUploader, { type MultiImageUploaderHandle } from "@/components/MultiImageUploader";
import ImageUploader, { type ImageUploaderHandle } from "@/components/ImageUploader";
import { isPreviewMode } from "@/lib/preview";
import {
  validateNickname, sanitizeNicknameInput, NICKNAME_MAX,
  validateIntroText, INTRO_MIN, INTRO_MAX,
} from "@/lib/validation";

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

  const [idealAgeRanges, setIdealAgeRanges] = useState<string[]>([]);
  const [idealMinHeight, setIdealMinHeight] = useState("");
  const [idealMaxHeight, setIdealMaxHeight] = useState("");
  const [idealCities, setIdealCities] = useState<string[]>([]);
  const [idealWorkplaces, setIdealWorkplaces] = useState<string[]>([]);
  const [idealSalaries, setIdealSalaries] = useState<string[]>([]);
  const [idealEducation, setIdealEducation] = useState<string[]>([]);
  const [idealSmoking, setIdealSmoking] = useState("");
  const [idealMbti, setIdealMbti] = useState<string[]>([]);
  const [topPriorities, setTopPriorities] = useState<string[]>([]);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);

  // 닉네임 중복체크 상태 (디바운스)
  const [nickStatus, setNickStatus] = useState<
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "ok" }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  useEffect(() => { setPreview(isPreviewMode()); }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const v = validateNickname(nickname);
    if (!v.ok) {
      // 입력 자체가 비었거나 너무 짧으면 idle, 형식 에러는 즉시 표시
      if (!nickname) setNickStatus({ kind: "idle" });
      else setNickStatus({ kind: "error", msg: v.reason });
      return;
    }
    setNickStatus({ kind: "checking" });
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-nickname?nickname=${encodeURIComponent(nickname.trim())}`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok) setNickStatus({ kind: "ok" });
        else setNickStatus({ kind: "error", msg: data.reason || "사용할 수 없는 닉네임입니다" });
      } catch {
        // 네트워크 실패 시는 통과시켜도 서버에서 다시 검증함
        setNickStatus({ kind: "ok" });
      }
    }, 350);
    return () => clearTimeout(id);
  }, [nickname]);

  const allRequiredAgreed = agreeTerms && agreePrivacy && agreeAge;
  const allAgreed = allRequiredAgreed && agreeMarketing;
  const toggleAll = () => {
    const next = !allAgreed;
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeAge(next);
    setAgreeMarketing(next);
  };

  const multiRef = useRef<MultiImageUploaderHandle>(null);
  const charmRef = useRef<ImageUploaderHandle>(null);
  const dateRef = useRef<ImageUploaderHandle>(null);

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

  type VErr = { msg: string; key: string } | null;

  const validateStep1 = (): VErr => {
    if (!realName.trim()) return { msg: "본명을 입력해주세요", key: "realName" };
    const nv = validateNickname(nickname);
    if (!nv.ok) return { msg: nv.reason, key: "nickname" };
    if (nickStatus.kind === "error") return { msg: nickStatus.msg, key: "nickname" };
    if (!gender) return { msg: "성별을 선택해주세요", key: "gender" };
    if (!birthYear) return { msg: "출생년도를 선택해주세요", key: "birthYear" };
    if (!height || isNaN(Number(height)) || Number(height) < 130 || Number(height) > 230) return { msg: "키를 정확히 입력해주세요 (130~230)", key: "height" };
    if (!/^010-\d{4}-\d{4}$/.test(phone)) return { msg: "전화번호를 올바르게 입력해주세요 (010-0000-0000)", key: "phone" };
    if (!city) return { msg: "거주지(시/도)를 선택해주세요", key: "city" };
    if (districtOptions.length > 0 && !district) return { msg: "거주지(구/군/시)를 선택해주세요", key: "city" };
    if (!workplace) return { msg: "직장을 선택해주세요", key: "workplace" };
    if (jobOptions.length > 0 && !job) return { msg: "직업을 선택해주세요", key: "job" };
    if (!workPattern) return { msg: "근무패턴을 선택해주세요", key: "workPattern" };
    if (!salary) return { msg: "연봉을 선택해주세요", key: "salary" };
    if (!education) return { msg: "학력을 선택해주세요", key: "education" };
    if (!smoking) return { msg: "흡연 여부를 선택해주세요", key: "smoking" };
    if (!mbti) return { msg: "MBTI를 선택해주세요", key: "mbti" };
    const cv = validateIntroText(charm, "저의 매력은");
    if (!cv.ok) return { msg: cv.reason, key: "charm" };
    const dv = validateIntroText(datingStyle, "연인이 생기면 하고 싶은 일은");
    if (!dv.ok) return { msg: dv.reason, key: "datingStyle" };

    // 사진 필수 검증 (업로드 중인 blob: URL 은 제외하고 실제 저장된 URL 만 카운트)
    const validPhotos = photoUrls.filter((u) => typeof u === "string" && u && !u.startsWith("blob:"));
    if (validPhotos.length < 2) return { msg: "대표 사진을 최소 2장 등록해주세요", key: "photoUrls" };
    if (!charmPhotoUrl || charmPhotoUrl.startsWith("blob:")) return { msg: "'저의 매력은' 사진을 등록해주세요", key: "charmPhotoUrl" };
    if (!datePhotoUrl || datePhotoUrl.startsWith("blob:")) return { msg: "'연인이 생기면' 사진을 등록해주세요", key: "datePhotoUrl" };
    return null;
  };

  const validateStep2 = (): VErr => {
    if (idealAgeRanges.length === 0) return { msg: "선호 나이를 1개 이상 선택해주세요", key: "idealAge" };
    if (!idealMinHeight || !idealMaxHeight) return { msg: "선호 키 범위를 입력해주세요", key: "idealHeight" };
    if (Number(idealMinHeight) > Number(idealMaxHeight)) return { msg: "선호 키: 최소가 최대보다 클 수 없습니다", key: "idealHeight" };
    if (idealCities.length === 0) return { msg: "선호 거주지를 1개 이상 선택해주세요", key: "idealCities" };
    if (idealWorkplaces.length === 0) return { msg: "선호 직장을 1개 이상 선택해주세요", key: "idealWorkplaces" };
    if (idealSalaries.length === 0) return { msg: "선호 연봉을 1개 이상 선택해주세요", key: "idealSalaries" };
    if (idealEducation.length === 0) return { msg: "선호 학력을 1개 이상 선택해주세요", key: "idealEducation" };
    if (!idealSmoking) return { msg: "선호 흡연여부를 선택해주세요", key: "idealSmoking" };
    if (idealMbti.length === 0) return { msg: "선호 MBTI를 1개 이상 선택해주세요", key: "idealMbti" };
    if (topPriorities.length !== 4) return { msg: "최애 포인트를 정확히 4개 선택해주세요", key: "topPriorities" };
    return null;
  };

  const flashAndScrollTo = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(`field-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-red-400", "rounded-2xl");
      setTimeout(() => el.classList.remove("ring-2", "ring-red-400", "rounded-2xl"), 1800);
    }, 30);
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err.msg); flashAndScrollTo(err.key); return; }
    setError("");
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err.msg); flashAndScrollTo(err.key); return; }
    if (!allRequiredAgreed) { setError("필수 약관에 모두 동의해 주세요"); flashAndScrollTo("consent"); return; }

    // 피드백용 미리보기 모드에서는 실제 가입을 막음
    if (isPreviewMode()) {
      alert("피드백용 미리보기입니다. 실제 가입은 'Google 계정으로 계속하기' 로 진행해주세요.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const [photoResult, charmResult, dateResult] = await Promise.all([
        multiRef.current?.waitForUploads(),
        charmRef.current?.waitForUpload(),
        dateRef.current?.waitForUpload(),
      ]);

      const body = {
        realName: realName.trim(),
        nickname: nickname.trim(),
        gender,
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
        photoUrls: photoResult?.urls ?? photoUrls,
        charmPhotoUrl: charmResult?.url ?? charmPhotoUrl,
        datePhotoUrl: dateResult?.url ?? datePhotoUrl,
        idealType: {
          idealAge: idealAgeRanges[0] ?? "",
          idealAgeRanges,
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
    } catch {
      setError("제출 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
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
      {submitting && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-8 h-8 border-3 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">가입 신청 중...</p>
          </div>
        </div>
      )}
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
        {preview && (
          <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-[13px] text-yellow-900">
            피드백용 미리보기입니다. 입력한 내용은 실제 저장되지 않아요. 정식 가입은 홈 화면의 <b>Google 계정으로 계속하기</b> 로 진행해주세요.
          </div>
        )}

        <div className="flex gap-1 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#ff8a3d" }} />
          <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: step === 2 ? "#ff8a3d" : "#e5e5e5" }} />
        </div>

        {error && (
          <div className="error-toast fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-[90%] px-5 py-3 bg-red-500 text-white rounded-xl shadow-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">프로필 기본 정보</h2>
            <p className="text-sm text-muted-fg -mt-3">모든 항목 필수 입력</p>

            <Field label="본명" id="realName">
              <input type="text" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="실명을 입력해주세요"
                className="input-field" />
            </Field>

            <Field label="닉네임" id="nickname">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(sanitizeNicknameInput(e.target.value))}
                placeholder={`이성에게 보여질 닉네임 (최대 ${NICKNAME_MAX}자, 특수문자/이모티콘 불가)`}
                maxLength={NICKNAME_MAX}
                className="input-field"
              />
              <div className="flex items-center justify-between mt-1 text-xs">
                <span>
                  {nickStatus.kind === "checking" && <span className="text-muted-fg">중복 확인 중...</span>}
                  {nickStatus.kind === "ok" && <span className="text-emerald-600 font-medium">사용 가능한 닉네임이에요</span>}
                  {nickStatus.kind === "error" && <span className="text-red-500 font-medium">{nickStatus.msg}</span>}
                </span>
                <span className="text-muted-fg">{nickname.length}/{NICKNAME_MAX}자</span>
              </div>
            </Field>

            <Field label="성별" id="gender">
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

            <Field label="출생년도" id="birthYear">
              <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>

            <Field label="키 (cm)" id="height">
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="130 ~ 230" min={130} max={230}
                className="input-field" />
            </Field>

            <Field label="전화번호" id="phone">
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000"
                className="input-field" />
              <p className="text-xs text-muted-fg mt-1">연락처는 비상시 외에는 절대 사용되지 않습니다</p>
            </Field>

            <Field label="거주지" id="city">
              <div className="flex gap-3">
                <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }} className="input-field flex-1">
                  <option value="">시/도 선택</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {districtOptions.length > 0 && (
                  <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field flex-1">
                    <option value="">구/군/시 선택</option>
                    {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
            </Field>

            <Field label="직장" id="workplace">
              <select value={workplace} onChange={(e) => { setWorkplace(e.target.value); setJob(""); }} className="input-field">
                <option value="">선택해주세요</option>
                {WORKPLACES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>

            {jobOptions.length > 0 && (
              <Field label="직업" id="job">
                <select value={job} onChange={(e) => setJob(e.target.value)} className="input-field">
                  <option value="">선택해주세요</option>
                  {jobOptions.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </Field>
            )}

            <Field label="근무패턴" id="workPattern">
              <select value={workPattern} onChange={(e) => setWorkPattern(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {WORK_PATTERNS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>

            <Field label="연봉" id="salary">
              <select value={salary} onChange={(e) => setSalary(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {SALARIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="학력" id="education">
              <select value={education} onChange={(e) => setEducation(e.target.value)} className="input-field">
                <option value="">선택해주세요</option>
                {EDUCATIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>

            <Field label="흡연" id="smoking">
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

            <Field label="MBTI" id="mbti">
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

            <Field label="저의 매력은" id="charm">
              <textarea value={charm} onChange={(e) => { if (e.target.value.length <= INTRO_MAX) setCharm(e.target.value); }}
                placeholder={`저의 매력을 자유롭게 적어주세요 (최소 ${INTRO_MIN}자)`} rows={5} maxLength={INTRO_MAX}
                className="input-field resize-none" />
              <span className={`text-xs ${charm.trim().length < INTRO_MIN ? "text-red-500" : "text-muted-fg"}`}>
                {charm.length}/{INTRO_MAX}자 {charm.trim().length < INTRO_MIN && `(최소 ${INTRO_MIN}자)`}
              </span>
            </Field>

            <Field label="연인이 생기면 하고 싶은 일은" id="datingStyle">
              <textarea value={datingStyle} onChange={(e) => { if (e.target.value.length <= INTRO_MAX) setDatingStyle(e.target.value); }}
                placeholder={`연인이 생기면 함께 하고 싶은 일을 적어주세요 (최소 ${INTRO_MIN}자)`} rows={5} maxLength={INTRO_MAX}
                className="input-field resize-none" />
              <span className={`text-xs ${datingStyle.trim().length < INTRO_MIN ? "text-red-500" : "text-muted-fg"}`}>
                {datingStyle.length}/{INTRO_MAX}자 {datingStyle.trim().length < INTRO_MIN && `(최소 ${INTRO_MIN}자)`}
              </span>
            </Field>

            <div className="pt-4 space-y-6 border-t border-gray-200">
              <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 text-[12px] text-orange-900 leading-relaxed">
                <b>📸 사진 안내</b><br />
                아래 3종의 사진은 모두 <b>필수 항목</b>입니다. 사진은 매칭 성사율에 가장 큰 영향을 주므로, 각 사진의 의도에 맞춰 정성껏 등록해주세요.
              </div>

              <div id="field-photoUrls" className="rounded-2xl p-1 -m-1 transition-shadow space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    1. 대표 사진 <span className="text-[#ff8a3d]">(필수 · 최소 2장, 최대 4장)</span>
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                    이성에게 가장 먼저 보여지는 <b>프로필 메인 사진</b>입니다.<br />
                    얼굴이 또렷하게 잘 보이는 사진을 골라주세요.<br />
                    <span className="text-gray-400">예) 셀카, 지인이 찍어준 인물 사진</span><br />
                    <span className="text-rose-500">⚠️ 단체사진 · 얼굴이 가려진 사진은 피해주세요</span>
                  </p>
                </div>
                <MultiImageUploader
                  ref={multiRef}
                  values={photoUrls}
                  maxCount={4}
                  category="photo"
                  onChanged={(_paths, urls) => setPhotoUrls(urls)}
                />
              </div>

              <div id="field-charmPhotoUrl" className="rounded-2xl p-1 -m-1 transition-shadow space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    2. 저의 매력 사진 <span className="text-[#ff8a3d]">(필수 · 1장)</span>
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                    위에 적으신 <b>‘저의 매력은’</b> 내용을 가장 잘 보여주는 사진을 등록해주세요.<br />
                    본인을 가장 매력적으로 표현할 수 있는 한 장이면 됩니다.<br />
                    <span className="text-gray-400">예) 운동하는 모습, 좋아하는 취미를 즐기는 모습, 일하는 모습 등</span>
                  </p>
                </div>
                <ImageUploader
                  ref={charmRef}
                  value={charmPhotoUrl}
                  category="charm"
                  onUploaded={(_path, url) => setCharmPhotoUrl(url)}
                  onRemove={() => setCharmPhotoUrl(null)}
                />
              </div>

              <div id="field-datePhotoUrl" className="rounded-2xl p-1 -m-1 transition-shadow space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    3. 연인이 생기면 하고 싶은 일 사진 <span className="text-[#ff8a3d]">(필수 · 1장)</span>
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                    위에 적으신 <b>‘연인이 생기면 하고 싶은 일’</b>을 시각적으로 보여주는 사진이에요.<br />
                    꼭 본인이 찍은 사진이 아니어도 괜찮아요. 분위기를 잘 전달할 수 있는 사진이면 OK!<br />
                    <span className="text-gray-400">예) 가고 싶은 여행지, 좋아하는 데이트 코스, 함께 즐기고 싶은 활동 사진 등</span>
                  </p>
                </div>
                <ImageUploader
                  ref={dateRef}
                  value={datePhotoUrl}
                  category="date"
                  onUploaded={(_path, url) => setDatePhotoUrl(url)}
                  onRemove={() => setDatePhotoUrl(null)}
                />
              </div>
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

            <Field label={`선호 나이 (복수 선택 가능, ${idealAgeRanges.length}개 선택)`} id="idealAge">
              <SelectAllRow
                allSelected={idealAgeRanges.length === AGE_RANGES.length}
                onAll={() => setIdealAgeRanges([...AGE_RANGES])}
                onClear={() => setIdealAgeRanges([])}
              />
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map(a => (
                  <button key={a} onClick={() => toggleMulti(idealAgeRanges, a, setIdealAgeRanges)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${idealAgeRanges.includes(a) ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                    style={idealAgeRanges.includes(a) ? { backgroundColor: "#ff8a3d" } : {}}>
                    {a}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="선호 키 (cm)" id="idealHeight">
              <div className="flex items-center gap-3">
                <input type="number" value={idealMinHeight} onChange={(e) => setIdealMinHeight(e.target.value)} placeholder="최소" min={130} max={230}
                  className="input-field flex-1" />
                <span className="text-muted-fg font-medium">~</span>
                <input type="number" value={idealMaxHeight} onChange={(e) => setIdealMaxHeight(e.target.value)} placeholder="최대" min={130} max={230}
                  className="input-field flex-1" />
              </div>
            </Field>

            <Field label="선호 거주지 (복수 선택)" id="idealCities">
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

            <Field label="선호 직장 (복수 선택)" id="idealWorkplaces">
              <SelectAllRow
                allSelected={idealWorkplaces.length === WORKPLACES.length}
                onAll={() => setIdealWorkplaces([...WORKPLACES])}
                onClear={() => setIdealWorkplaces([])}
              />
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

            <Field label="선호 연봉 (복수 선택)" id="idealSalaries">
              <SelectAllRow
                allSelected={idealSalaries.length === SALARIES.length}
                onAll={() => setIdealSalaries([...SALARIES])}
                onClear={() => setIdealSalaries([])}
              />
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

            <Field label="선호 학력 (복수 선택)" id="idealEducation">
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

            <Field label="선호 흡연여부" id="idealSmoking">
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

            <Field label="선호 MBTI (복수 선택)" id="idealMbti">
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

            <Field label={`나의 최애 포인트 (${topPriorities.length}/4 선택)`} id="topPriorities">
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

            <div id="field-consent" className="rounded-2xl border border-border bg-white p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allAgreed} onChange={toggleAll}
                  className="w-5 h-5 accent-[#ff8a3d] cursor-pointer" />
                <span className="text-sm font-bold text-gray-900">전체 약관에 동의합니다</span>
              </label>
              <div className="border-t border-border pt-3 space-y-2.5">
                <ConsentRow checked={agreeTerms} onChange={setAgreeTerms} required label="이용약관 동의" href="/terms" />
                <ConsentRow checked={agreePrivacy} onChange={setAgreePrivacy} required label="개인정보 수집·이용 동의" href="/privacy" />
                <ConsentRow checked={agreeAge} onChange={setAgreeAge} required label="만 19세 이상입니다" />
                <ConsentRow checked={agreeMarketing} onChange={setAgreeMarketing} label="(선택) 이벤트·소식 알림 수신 동의" />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitting || !allRequiredAgreed}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
              style={{ backgroundColor: "#ff8a3d" }}>
              {submitting && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? "제출 중..." : "가입 신청하기"}
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
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .error-toast {
          animation: toastIn 0.18s ease-out;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children, id }: { label: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id ? `field-${id}` : undefined} className="transition-shadow p-1 -m-1">
      <label className="block text-sm font-semibold text-foreground mb-2">{label}</label>
      {children}
    </div>
  );
}

// 다중 선택 항목에서 "전체 선택 / 무관" 단축 버튼 한 줄
function SelectAllRow({ allSelected, onAll, onClear }: { allSelected: boolean; onAll: () => void; onClear: () => void }) {
  return (
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        onClick={onAll}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          allSelected ? "text-white border-transparent" : "bg-white text-foreground border-border hover:border-[#ff8a3d]/30"
        }`}
        style={allSelected ? { backgroundColor: "#ff8a3d" } : {}}
      >
        전체 선택
      </button>
      <button
        type="button"
        onClick={onClear}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-muted-fg border border-border hover:border-gray-400 transition-colors"
      >
        무관 (선택 해제)
      </button>
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  label,
  href,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  href?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex items-center gap-3 cursor-pointer flex-1">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-[#ff8a3d] cursor-pointer" />
        <span className="text-sm text-gray-700">
          {required && <span className="text-[#ff8a3d] font-bold mr-1">[필수]</span>}
          {label}
        </span>
      </label>
      {href && (
        <Link href={href} target="_blank" className="text-xs text-gray-500 underline hover:text-gray-700 shrink-0">
          전체보기
        </Link>
      )}
    </div>
  );
}
