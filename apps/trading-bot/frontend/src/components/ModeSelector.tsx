import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ExecutionMode, ModeStatus } from "../types/mode";

/**
 * 실행 모드(mock / live) 선택.
 * 저장된 값은 다음 재시작 시 SPRING_PROFILES_ACTIVE 로 적용됩니다.
 * 재시작 없이 즉시 전환하지 않는 이유: 실전 매매 도중 오조작 방지.
 */
export function ModeSelector() {
  const [status, setStatus] = useState<ModeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setStatus(await api.mode.status());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { void refresh(); }, []);

  const select = async (profile: ExecutionMode) => {
    if (!status || status.pending === profile) return;
    setBusy(true);
    setError(null);
    try {
      setStatus(await api.mode.set(profile));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <section className="panel">
        <h2 style={{ margin: 0 }}>실행 모드</h2>
        {error ? <p className="error">에러: {error}</p> : <p className="source">로드 중...</p>}
      </section>
    );
  }

  const isMockPending = status.pending === "mock";
  const isLivePending = status.pending === "live";

  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>실행 모드</h2>
        <span className={status.current === "live" ? "warn" : "ok"}>
          현재: <strong>{status.current || "?"}</strong>
        </span>
      </div>

      {error && <p className="error">에러: {error}</p>}

      <div className="row" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
        <button
          onClick={() => void select("mock")}
          disabled={busy || isMockPending}
          className={isMockPending ? "primary" : ""}
          title="KIS 미호출. 자격증명 없이도 UI 검증 가능."
        >
          {isMockPending ? "✓ mock (다음 실행)" : "mock 으로 저장"}
        </button>
        <button
          onClick={() => void select("live")}
          disabled={busy || isLivePending}
          className={isLivePending ? "danger" : ""}
          title="KIS 실호출. 실계좌에 영향 가능."
        >
          {isLivePending ? "✓ live (다음 실행)" : "live 로 저장"}
        </button>
      </div>

      {status.restartNeeded ? (
        <p className="warn" style={{ marginTop: "0.75rem" }}>
          ⚠️ 저장 완료 — <strong>{status.pending}</strong> 로 전환하려면 백엔드를 재시작하세요
          (터미널에서 <code>./end-dev.sh &amp;&amp; ./start-dev.sh</code>).
        </p>
      ) : (
        <p className="source" style={{ marginTop: "0.75rem" }}>
          다음 재시작 시에도 <strong>{status.pending || status.current}</strong> 로 부팅됩니다.
        </p>
      )}

      <p className="source" style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>
        갱신 대상: <code className="mono">{status.envFile}</code> 의{" "}
        <code className="mono">SPRING_PROFILES_ACTIVE</code>
      </p>
    </section>
  );
}
