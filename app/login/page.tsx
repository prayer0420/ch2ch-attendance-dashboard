import { LockKeyhole } from "lucide-react";
import { Panel } from "@/components/ui";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    setup?: string;
    logout?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Panel className="w-full max-w-md p-6 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded bg-ink text-paper">
            <LockKeyhole size={21} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sea">CH2CH Admin</p>
            <h1 className="font-display text-3xl font-bold">관리자 접속</h1>
          </div>
        </div>

        {params.setup ? (
          <div className="mb-4 rounded border border-brick/30 bg-brick/10 p-3 text-sm font-bold text-brick">
            배포 환경변수에 APP_ACCESS_PASSWORD와 APP_SESSION_TOKEN을 먼저 설정해야 합니다.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-4 rounded border border-brick/30 bg-brick/10 p-3 text-sm font-bold text-brick">
            접속 코드가 맞지 않습니다.
          </div>
        ) : null}
        {params.logout ? (
          <div className="mb-4 rounded border border-moss/30 bg-moss/10 p-3 text-sm font-bold text-moss">
            로그아웃했습니다.
          </div>
        ) : null}

        <form className="grid gap-4" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label className="grid gap-2 text-sm font-black">
            <span>접속 코드</span>
            <input
              className="focus-ring h-12 rounded border border-line bg-white px-4 text-base font-bold"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="관리자에게 받은 접속 코드"
              required
            />
          </label>
          <button className="focus-ring rounded bg-ink px-4 py-3 font-black text-paper transition hover:bg-sea">
            들어가기
          </button>
        </form>
        <p className="mt-4 text-sm leading-6 text-ink/60">
          출석 정보와 전화번호가 포함된 관리 화면이라 허용된 사람만 접속할 수 있습니다.
        </p>
      </Panel>
    </main>
  );
}
