// 다중 선택 필터 유틸리티
// 필터 상태는 Record<string, string[]> 형태이며, 각 키마다 0개 이상의 값이 선택됨.
// 빈 배열 = 해당 항목 미적용 (전체 통과).

export type MultiFilters = Record<string, string[]>;

export function activeCount(filters: MultiFilters): number {
  let n = 0;
  for (const arr of Object.values(filters)) {
    if (arr && arr.length > 0) n++;
  }
  return n;
}

export function toggleFilterValue(prev: MultiFilters, key: string, value: string): MultiFilters {
  const cur = prev[key] ?? [];
  const exists = cur.includes(value);
  const next = exists ? cur.filter((v) => v !== value) : [...cur, value];
  const out = { ...prev };
  if (next.length === 0) delete out[key];
  else out[key] = next;
  return out;
}

export function setFilterAll(prev: MultiFilters, key: string, allValues: readonly string[]): MultiFilters {
  return { ...prev, [key]: [...allValues] };
}

export function clearFilterKey(prev: MultiFilters, key: string): MultiFilters {
  const out = { ...prev };
  delete out[key];
  return out;
}

// "~2007년" / "1980년~" / "2006년~1997년" 형태를 [min, max] 로 파싱
export function parseAgeRange(s: string): [number, number] {
  const nums = s.match(/\d+/g)?.map(Number) ?? [];
  if (s.startsWith("~") && nums.length === 1) return [nums[0], 9999];
  if (s.endsWith("~") && nums.length === 1) return [0, nums[0]];
  if (nums.length === 2) {
    const [a, b] = nums;
    return [Math.min(a, b), Math.max(a, b)];
  }
  return [0, 9999];
}

// "171~175" / "185~230" 형태를 [min, max] 로 파싱
export function parseHeightRange(s: string): [number, number] {
  const nums = s
    .split(/[~\-]/)
    .map((x) => Number(x.trim()))
    .filter((x) => !isNaN(x));
  if (nums.length === 2) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  return [0, 9999];
}

// 다중 필터로 사용자 매칭 검사. 각 키별로 wants 배열에 하나라도 일치해야 통과.
// fields: 비교 시 사용자 객체에서 어떤 키를 읽을지 매핑 (예: birthYear, height, smoking ...)
export interface MatchableUser {
  birthYear?: number;
  height?: number;
  smoking?: boolean;
  city?: string;
  district?: string;
  workplace?: string;
  job?: string;
  education?: string;
  mbti?: string;
}

export function matchInfoFilters<T extends MatchableUser>(u: T, filters: MultiFilters): boolean {
  for (const key of Object.keys(filters)) {
    const wants = filters[key] ?? [];
    if (wants.length === 0) continue;

    if (key === "smoking") {
      const userIs = u.smoking ? "유" : "무";
      if (!wants.includes(userIs)) return false;
    } else if (key === "birthYear") {
      const v = u.birthYear;
      if (typeof v !== "number") return false;
      const ok = wants.some((w) => {
        const [min, max] = parseAgeRange(w);
        return v >= min && v <= max;
      });
      if (!ok) return false;
    } else if (key === "height") {
      const v = u.height;
      if (typeof v !== "number") return false;
      const ok = wants.some((w) => {
        const [min, max] = parseHeightRange(w);
        return v >= min && v <= max;
      });
      if (!ok) return false;
    } else {
      const val = (u as unknown as Record<string, unknown>)[key];
      if (!wants.includes(String(val ?? ""))) return false;
    }
  }
  return true;
}
