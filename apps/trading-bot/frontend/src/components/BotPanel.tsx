import { useEffect, useState } from "react";
import { api } from "../api/client";
import { localNameOf } from "../data/knownStocks";
import type { BotDecision, BotStatus, DiscoveredCandidate, SignalAction } from "../types/bot";

function actionClass(action: SignalAction): string {
  switch (action) {
    case "BUY": return "up";
    case "SELL": return "down";
    default: return "";
  }
}

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

export function BotPanel() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);

  const refresh = async () => {
    try {
      setStatus(await api.bot.status());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    refresh();
    // 활성 상태에서 30초마다 새로고침 (분당 실행이라 자주 볼 필요는 없음).
    const iv = window.setInterval(() => { void refresh(); }, 30_000);
    return () => window.clearInterval(iv);
  }, []);

  const trigger = async () => {
    setRunning(true);
    setError(null);
    try {
      await api.bot.run();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const toggleAuto = async () => {
    if (!status) return;
    setToggling(true);
    setError(null);
    try {
      if (status.active) {
        await api.bot.stop();
      } else {
        await api.bot.start();
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setToggling(false);
    }
  };

  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>매매 봇</h2>
        <div className="row" style={{ gap: "0.5rem" }}>
          <button
            onClick={toggleAuto}
            disabled={toggling}
            className={status?.active ? "danger" : "primary"}
            title={
              status?.active
                ? "스케줄러 tick 을 중지합니다"
                : "스케줄러가 다음 tick 부터 매매 결정을 처리합니다"
            }
          >
            {toggling
              ? "전환 중..."
              : status?.active
                ? "자동 매매 중지"
                : "자동 매매 시작"}
          </button>
          <button onClick={refresh} disabled={running || toggling}>새로고침</button>
          <button onClick={trigger} disabled={running || toggling}>
            {running ? "실행 중..." : "지금 결정"}
          </button>
        </div>
      </div>
      {error && <p className="error">에러: {error}</p>}
      {status && (
        <>
          <dl className="quote" style={{ marginTop: "1rem" }}>
            <dt>자동 매매</dt>
            <dd>
              {status.active
                ? <span className="ok">RUNNING · 스케줄러가 tick 을 처리 중</span>
                : <span className="warn">STOPPED · 시작 버튼을 눌러야 스케줄러가 결정합니다</span>}
            </dd>
            <dt>실주문 게이트</dt>
            <dd>
              {status.enabled
                ? <span className="ok">bot.enabled=true</span>
                : <span className="warn">bot.enabled=false (dry-run)</span>}
              {status.dryRun && !status.enabled ? " · trading.order-enabled 도 확인 필요" : ""}
            </dd>
            <dt>스케줄</dt><dd className="mono">{status.cron} (KST)</dd>
            <dt>후보 발굴</dt>
            <dd>
              <span className="chip mono">{status.discoverySource}</span>
              {" "}
              <span className="source">
                최근 {status.discoveredCandidates.length}건
              </span>
            </dd>
            {status.discoveredCandidates.length > 0 && (
              <>
                <dt>발굴된 후보</dt>
                <dd>
                  {status.discoveredCandidates.map((c: DiscoveredCandidate) => (
                    <span key={c.stockCode} className="chip">
                      {c.stockName || localNameOf(c.stockCode) || c.stockCode}
                      {" "}
                      <span className="mono">({c.stockCode})</span>
                      {c.currentPrice > 0 && (
                        <>
                          {" "}
                          <span className="source">{c.currentPrice.toLocaleString()}원</span>
                          {" "}
                          <span className={c.changeRate >= 0 ? "up" : "down"}>
                            {c.changeRate >= 0 ? "+" : ""}
                            {c.changeRate.toFixed(2)}%
                          </span>
                        </>
                      )}
                    </span>
                  ))}
                </dd>
              </>
            )}
            <dt>손절 / 익절</dt>
            <dd>
              <span className="down">{status.stopLossPct > 0 ? `-${status.stopLossPct.toFixed(1)}%` : "off"}</span>
              {" / "}
              <span className="up">{status.takeProfitPct > 0 ? `+${status.takeProfitPct.toFixed(1)}%` : "off"}</span>
            </dd>
            <dt>마지막 실행</dt><dd>{fmtTime(status.lastRunAt)}</dd>
          </dl>

          <h3 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>현재 포지션</h3>
          {status.position ? (
            <dl className="quote">
              <dt>종목</dt>
              <dd>{status.position.stockName || localNameOf(status.position.stockCode) || status.position.stockCode} <span className="mono">({status.position.stockCode})</span></dd>
              <dt>수량</dt><dd>{status.position.quantity}</dd>
              <dt>진입가</dt><dd>{status.position.entryPrice.toLocaleString()}</dd>
              <dt>진입 시각</dt><dd>{fmtTime(status.position.entryAt)}</dd>
              {status.positionSnapshot && (
                <>
                  <dt>현재가</dt>
                  <dd>{status.positionSnapshot.currentPrice.toLocaleString()}</dd>
                  <dt>미실현 손익</dt>
                  <dd className={status.positionSnapshot.unrealizedPnl >= 0 ? "up" : "down"}>
                    {status.positionSnapshot.unrealizedPnl >= 0 ? "+" : ""}
                    {status.positionSnapshot.unrealizedPnl.toLocaleString()}원
                    {" "}
                    ({status.positionSnapshot.unrealizedPnlPct >= 0 ? "+" : ""}
                    {status.positionSnapshot.unrealizedPnlPct.toFixed(2)}%)
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="source">보유 포지션 없음</p>
          )}

          <h3 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>최근 결정</h3>
          {status.recentDecisions.length === 0 ? (
            <p className="source">아직 없음</p>
          ) : (
            <table className="decisions">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>종목</th>
                  <th>시그널</th>
                  <th>참조가</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {status.recentDecisions.map((d: BotDecision, i: number) => (
                  <tr key={`${d.decidedAt}-${d.stockCode}-${i}`}>
                    <td className="mono">{fmtTime(d.decidedAt)}</td>
                    <td>
                      {d.stockName || localNameOf(d.stockCode) || d.stockCode}
                      <span className="mono"> ({d.stockCode})</span>
                    </td>
                    <td className={actionClass(d.signal.action)}>
                      <strong>{d.signal.action}</strong>
                      <div className="source">{d.signal.reason}</div>
                    </td>
                    <td className="mono">{d.referencePrice ? d.referencePrice.toLocaleString() : "-"}</td>
                    <td>{d.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
