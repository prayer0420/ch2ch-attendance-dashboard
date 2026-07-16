"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleOff,
  LoaderCircle,
  Phone,
  Search,
  UserRound
} from "lucide-react";
import { Badge, EmptyState, Panel } from "@/components/ui";

type Member = {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  affiliation: string;
  ch2chId: string;
};

type VisibleFields = {
  phone: boolean;
  birthDate: boolean;
  affiliation: boolean;
};

type Proof = {
  image: string;
  capturedAt: string;
  member: Member;
};

const fieldLabels: Array<{ key: keyof VisibleFields; label: string }> = [
  { key: "phone", label: "전화번호" },
  { key: "birthDate", label: "생년월일" },
  { key: "affiliation", label: "소속" }
];

export function MemberSearch() {
  const [name, setName] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [visibleFields, setVisibleFields] = useState<VisibleFields>({ phone: true, birthDate: true, affiliation: true });
  const [activeTab, setActiveTab] = useState<"results" | "proof">("results");
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/member-search", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!ignore) setConnected(Boolean(payload.connected));
      })
      .catch(() => {
        if (!ignore) setConnected(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function toggleField(key: keyof VisibleFields) {
    setVisibleFields((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = name.trim();
    if (query.length < 2) {
      setError("이름을 두 글자 이상 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(false);
    setProofError(null);
    try {
      const response = await fetch("/api/member-search", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query })
      });
      const payload = await response.json();
      setConnected(Boolean(payload.connected));
      if (!response.ok) throw new Error(payload.error || "검색에 실패했습니다.");
      setResults(payload.data || []);
      setLastQuery(query);
      setSearched(true);
      setActiveTab("results");
    } catch (searchError) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function openProof(member: Member) {
    if (!lastQuery) return;
    setActiveTab("proof");
    setProofLoadingId(member.id);
    setProofError(null);
    try {
      const response = await fetch("/api/member-search/proof", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lastQuery, memberId: member.id, member })
      });
      const payload = await response.json();
      setConnected(Boolean(payload.connected));
      if (!response.ok) throw new Error(payload.error || "CH2CH 화면 확인에 실패했습니다.");
      setProof(payload);
    } catch (proofLoadError) {
      setProof(null);
      setProofError(proofLoadError instanceof Error ? proofLoadError.message : "CH2CH 화면 확인에 실패했습니다.");
    } finally {
      setProofLoadingId(null);
    }
  }

  const selectedFieldText = fieldLabels.filter((field) => visibleFields[field.key]).map((field) => field.label).join(" · ") || "이름만";

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
      <Panel className="p-5 sm:p-6">
        <form onSubmit={submit} className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0">
            <span className="mb-2 block text-sm font-black">교인 이름</span>
            <div className="flex h-12 items-center gap-3 rounded border border-line bg-white px-4 focus-within:border-sea focus-within:ring-2 focus-within:ring-sea/15">
              <Search size={19} className="shrink-0 text-ink/45" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:text-ink/35"
                placeholder="예: 박기도"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-auto inline-flex h-12 items-center justify-center gap-2 rounded bg-ink px-6 text-sm font-black text-paper transition hover:bg-sea disabled:cursor-wait disabled:opacity-65"
          >
            {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? "조회 중" : "검색"}
          </button>
        </form>

        {error ? <div className="mt-4 rounded border border-brick/30 bg-brick/10 p-4 text-sm font-bold text-brick">{error}</div> : null}

        <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`focus-ring rounded px-4 py-2 text-sm font-black ${activeTab === "results" ? "bg-ink text-paper" : "border border-line bg-white text-ink"}`}
          >
            검색 결과
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("proof")}
            className={`focus-ring rounded px-4 py-2 text-sm font-black ${activeTab === "proof" ? "bg-ink text-paper" : "border border-line bg-white text-ink"}`}
          >
            확인 화면
          </button>
        </div>

        <div className="mt-5">
          {activeTab === "results" ? (
            loading ? (
              <div className="grid min-h-52 place-items-center text-sm font-bold text-ink/55">
                <span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" />CH2CH에서 조회 중</span>
              </div>
            ) : results.length ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="font-black">검색 결과 {results.length}명</span>
                  <span className="text-ink/55">표시 항목: {selectedFieldText}</span>
                </div>
                {results.map((member) => (
                  <article key={member.id} className="rounded border border-line bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded bg-sea/10 text-sea"><UserRound size={18} /></span>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-black">{member.name}</h2>
                          {member.ch2chId ? <p className="mt-0.5 text-xs font-bold text-ink/45">CH2CH ID {member.ch2chId}</p> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openProof(member)}
                        disabled={proofLoadingId === member.id}
                        className="focus-ring inline-flex items-center gap-2 rounded border border-sea/35 bg-sea/10 px-3 py-2 text-xs font-black text-sea transition hover:bg-sea hover:text-white disabled:cursor-wait disabled:opacity-70"
                      >
                        {proofLoadingId === member.id ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />}
                        CH2CH 화면 보기
                      </button>
                    </div>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      {visibleFields.phone ? (
                        <div className="flex items-center gap-3">
                          <Phone size={17} className="shrink-0 text-moss" />
                          <div><dt className="text-xs font-bold text-ink/50">전화번호</dt><dd className="mt-0.5 font-black tabular-nums">{member.phone}</dd></div>
                        </div>
                      ) : null}
                      {visibleFields.birthDate ? (
                        <div className="flex items-center gap-3">
                          <CalendarDays size={17} className="shrink-0 text-brass" />
                          <div><dt className="text-xs font-bold text-ink/50">생년월일</dt><dd className="mt-0.5 font-black tabular-nums">{member.birthDate}</dd></div>
                        </div>
                      ) : null}
                      {visibleFields.affiliation ? (
                        <div className="flex items-center gap-3 sm:col-span-2">
                          <Building2 size={17} className="shrink-0 text-sea" />
                          <div className="min-w-0"><dt className="text-xs font-bold text-ink/50">소속</dt><dd className="mt-0.5 break-words font-black">{member.affiliation || "-"}</dd></div>
                        </div>
                      ) : null}
                    </dl>
                  </article>
                ))}
              </div>
            ) : searched ? (
              <EmptyState>일치하는 교인을 찾지 못했습니다.</EmptyState>
            ) : (
              <div className="min-h-52 border-t border-line" />
            )
          ) : (
            <div className="grid gap-3">
              {proofLoadingId ? (
                <div className="grid min-h-52 place-items-center rounded border border-line bg-white text-sm font-bold text-ink/55">
                  <span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" />CH2CH 화면 캡처 중</span>
                </div>
              ) : proof ? (
                <article className="rounded border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                    <div>
                      <h2 className="text-lg font-black">{proof.member.name}</h2>
                      <p className="mt-1 text-xs font-bold text-ink/50">{new Date(proof.capturedAt).toLocaleString("ko-KR")}</p>
                    </div>
                    <Badge tone="good">화면 확인</Badge>
                  </div>
                  <img src={proof.image} alt={`${proof.member.name} CH2CH 검색 결과 화면`} className="max-h-[560px] w-full rounded border border-line object-contain" />
                </article>
              ) : proofError ? (
                <div className="rounded border border-brick/30 bg-brick/10 p-4 text-sm font-bold text-brick">{proofError}</div>
              ) : (
                <EmptyState>검색 결과에서 `CH2CH 화면 보기`를 누르면 실제 결과 화면이 여기에 표시됩니다.</EmptyState>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel className="h-fit">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black">CH2CH 접속</h2>
          <Badge tone={connected ? "good" : "warn"}>{connected ? "접속중" : "미접속"}</Badge>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded border border-line bg-white p-3 text-sm font-bold">
          {connected ? <CheckCircle2 size={18} className="text-moss" /> : <CircleOff size={18} className="text-brass" />}
          <span>{connected ? "CH2CH 로그인 세션이 살아 있습니다." : "첫 검색 전에는 아직 연결되지 않았습니다."}</span>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-black">조회 항목</h3>
          <div className="mt-3 grid gap-2">
            {fieldLabels.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => toggleField(field.key)}
                className={`focus-ring flex items-center justify-between rounded border px-3 py-2 text-sm font-black transition ${visibleFields[field.key] ? "border-sea/35 bg-sea/10 text-sea" : "border-line bg-white text-ink/55"}`}
              >
                <span>{field.label}</span>
                <span>{visibleFields[field.key] ? "표시" : "숨김"}</span>
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
