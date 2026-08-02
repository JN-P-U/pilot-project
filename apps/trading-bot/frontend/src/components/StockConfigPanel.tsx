import { useEffect, useState } from "react";
import { api } from "../api/client";
import { localNameOf } from "../data/knownStocks";
import type {
  CandidateAnalyzeResponse,
  StockConfig,
  WeeklyScored,
} from "../types/stocks";
import { StockDetailModal } from "./StockDetailModal";

type DetailTarget = null | { title: string; codes: string[] };

/**
 * 허용 종목(TradingGuard whitelist) 과 후보 종목(BotCandidates) 을 프론트에서 편집.
 * 값은 .env 에 저장되며 재시작 후 적용됩니다.
 * 하단 "추천 종목" 표는 백엔드 WeeklyCandidateAnalyzer 결과 (지난주 수익률/거래량 트렌드/SMA/RSI 종합 스코어).
 * 사용자는 표를 참고해 상단 입력창에 코드를 직접 입력·저장합니다.
 */
export function StockConfigPanel() {
  const [config, setConfig] = useState<StockConfig | null>(null);
  const [allowedInput, setAllowedInput] = useState("");
  const [candidatesInput, setCandidatesInput] = useState("");
  const [savingAllowed, setSavingAllowed] = useState(false);
  const [savingCandidates, setSavingCandidates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<CandidateAnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detail, setDetail] = useState<DetailTarget>(null);

  const refresh = async () => {
    try {
      const c = await api.stocks.config();
      setConfig(c);
      setAllowedInput(c.pendingAllowed.join(","));
      setCandidatesInput(c.pendingCandidates.join(","));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => { void refresh(); }, []);

  const saveAllowed = async () => {
    setSavingAllowed(true);
    setError(null);
    try {
      const c = await api.stocks.save({
        allowedStockCodes: parseCsv(allowedInput),
      });
      setConfig(c);
      setAllowedInput(c.pendingAllowed.join(","));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingAllowed(false);
    }
  };

  const saveCandidates = async () => {
    setSavingCandidates(true);
    setError(null);
    try {
      const c = await api.stocks.save({
        botCandidates: parseCsv(candidatesInput),
      });
      setConfig(c);
      setCandidatesInput(c.pendingCandidates.join(","));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingCandidates(false);
    }
  };

  const analyzeWeekly = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      setRecommendation(await api.stocks.analyze(10, 30));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeToday = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      setRecommendation(await api.stocks.analyzeToday(10, 30));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const appendCode = (list: "allowed" | "candidates", code: string) => {
    const target = list === "allowed" ? allowedInput : candidatesInput;
    const set = new Set(parseCsv(target));
    set.add(code);
    const merged = [...set].join(",");
    if (list === "allowed") setAllowedInput(merged);
    else setCandidatesInput(merged);
  };

  return (
    <section className="panel">
      <h2 style={{ margin: 0 }}>종목 설정</h2>
      <p className="source" style={{ marginTop: "0.25rem" }}>
        저장은 <code className="mono">{config?.envFile ?? ".env"}</code> 에 반영되고,
        {" "}백엔드 재시작 후 적용됩니다.
      </p>
      {error && <p className="error">에러: {error}</p>}

      {/* 허용 종목 */}
      <div style={{ marginTop: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="row" style={{ alignItems: "baseline", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>허용 종목 (whitelist)</h3>
            <button
              className="link"
              onClick={() => setDetail({
                title: "허용 종목 상세",
                codes: parseCsv(allowedInput),
              })}
              disabled={parseCsv(allowedInput).length === 0}
            >
              상세 보기 ({parseCsv(allowedInput).length})
            </button>
          </div>
          <span className="source">
            현재 부팅값: {config ? formatChipList(config.currentAllowed) : "-"}
          </span>
        </div>
        <p className="source" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
          TradingGuard 가 이 목록에 없는 종목은 주문을 거부합니다. 비어있으면 전체 허용(위험).
        </p>
        <div className="row" style={{ gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
          <input
            style={{ flex: 1, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            placeholder="005930,035720,..."
            value={allowedInput}
            onChange={(e) => setAllowedInput(e.target.value)}
          />
          <button onClick={saveAllowed} disabled={savingAllowed} className="primary">
            {savingAllowed ? "저장 중..." : "저장"}
          </button>
        </div>
        {config?.allowedRestartNeeded && (
          <p className="warn" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
            ⚠️ 재시작 필요 (다음 부팅부터 적용)
          </p>
        )}
      </div>

      {/* 후보 종목 */}
      <div style={{ marginTop: "1.25rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="row" style={{ alignItems: "baseline", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>후보 종목 (STATIC 모드 전용)</h3>
            <button
              className="link"
              onClick={() => setDetail({
                title: "후보 종목 상세",
                codes: parseCsv(candidatesInput),
              })}
              disabled={parseCsv(candidatesInput).length === 0}
            >
              상세 보기 ({parseCsv(candidatesInput).length})
            </button>
          </div>
          <span className="source">
            현재 부팅값: {config ? formatChipList(config.currentCandidates) : "-"}
          </span>
        </div>
        <p className="source" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
          봇이 순회할 종목. <b>기본 모드 TECHNICAL_ANALYSIS</b> 에선 무시됩니다
          (기술적 분석 스코어 상위 N 개가 자동으로 후보). STATIC 모드로 명시 전환한 경우에만 사용.
        </p>
        <div className="row" style={{ gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
          <input
            style={{ flex: 1, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            placeholder="005930,035720,..."
            value={candidatesInput}
            onChange={(e) => setCandidatesInput(e.target.value)}
          />
          <button onClick={saveCandidates} disabled={savingCandidates} className="primary">
            {savingCandidates ? "저장 중..." : "저장"}
          </button>
        </div>
        {config?.candidatesRestartNeeded && (
          <p className="warn" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
            ⚠️ 재시작 필요 (다음 부팅부터 적용)
          </p>
        )}
      </div>

      {/* 추천 종목 */}
      <div style={{ marginTop: "1.25rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>추천 종목 (기술적 분석)</h3>
          <div className="row" style={{ gap: "0.5rem" }}>
            <button onClick={analyzeWeekly} disabled={analyzing}>
              {analyzing ? "분석 중..." : "지난주 데이터로 분석"}
            </button>
            <button onClick={analyzeToday} disabled={analyzing}>
              {analyzing ? "분석 중..." : "당일 데이터로 분석"}
            </button>
          </div>
        </div>
        <p className="source" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
          지난주 = KIS 일봉 (5거래일 수익률/거래량). 당일 = 1분봉 (시가→현재가 수익률, 5·20분 SMA, 14분 RSI).
          아래 표를 참고해 위 입력창에 코드를 붙이거나, 우측 버튼으로 바로 추가하세요.
        </p>
        {recommendation && (
          <>
            <p className="source" style={{ marginTop: "0.5rem" }}>
              <span className="chip mono">
                {recommendation.period === "intraday" ? "당일 분봉" : "주간 일봉"}
              </span>
              {" "}결과: {recommendation.message}
              {recommendation.candidates && (
                <>
                  {" · CSV: "}
                  <code className="mono">{recommendation.candidates}</code>
                </>
              )}
            </p>
            {recommendation.scored.length > 0 && (
              <table className="decisions" style={{ marginTop: "0.5rem" }}>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>종목</th>
                    <th>{recommendation.period === "intraday" ? "현재가" : "종가"}</th>
                    <th>{recommendation.period === "intraday" ? "당일" : "주간"}</th>
                    <th>거래량</th>
                    <th>SMA{recommendation.period === "intraday" ? " (5분/20분)" : " (5일/20일)"}</th>
                    <th>RSI{recommendation.period === "intraday" ? "(14분)" : "(14일)"}</th>
                    <th>스코어</th>
                    <th>추가</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendation.scored.map((s: WeeklyScored, i: number) => (
                    <tr key={s.stockCode}>
                      <td className="mono">{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "baseline" }}>
                          <span>{s.stockName || localNameOf(s.stockCode) || "(이름 미상)"}</span>
                          <span className="mono source">({s.stockCode})</span>
                        </div>
                      </td>
                      <td className="mono">{s.closePrice.toLocaleString()}</td>
                      <td className={s.weeklyReturnPct >= 0 ? "up" : "down"}>
                        {s.weeklyReturnPct >= 0 ? "+" : ""}
                        {s.weeklyReturnPct.toFixed(2)}%
                      </td>
                      <td className={s.volumeTrendPct >= 0 ? "up" : "down"}>
                        {s.volumeTrendPct >= 0 ? "+" : ""}
                        {s.volumeTrendPct.toFixed(1)}%
                      </td>
                      <td className={s.sma5 > s.sma20 ? "up" : "down"}>
                        <span className="mono">
                          {Math.round(s.sma5).toLocaleString()}/{Math.round(s.sma20).toLocaleString()}
                        </span>
                      </td>
                      <td className={
                        s.rsi14 >= 40 && s.rsi14 <= 70 ? "ok"
                          : s.rsi14 > 70 ? "warn" : "source"
                      }>
                        {s.rsi14.toFixed(1)}
                      </td>
                      <td className="mono">{s.totalScore.toFixed(1)}</td>
                      <td>
                        <button
                          onClick={() => appendCode("allowed", s.stockCode)}
                          title="허용 종목 입력창에 추가"
                          style={{ marginRight: "0.25rem", fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                        >
                          +허용
                        </button>
                        <button
                          onClick={() => appendCode("candidates", s.stockCode)}
                          title="후보 종목 입력창에 추가"
                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                        >
                          +후보
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* 뉴스 기반 추천 (미구현 안내) */}
      <div style={{ marginTop: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>뉴스 기반 추천</h3>
        <p className="source" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
          뉴스 API 미연동. 네이버 뉴스 API 등을 붙이면 종목별 최신 뉴스 감성 분석을
          기술적 분석과 합쳐 표시할 수 있습니다. 별도 API 키와 통합 작업이 필요합니다.
        </p>
      </div>

      {detail && (
        <StockDetailModal
          title={detail.title}
          codes={detail.codes}
          nameByCode={config?.nameByCode ?? {}}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}

function parseCsv(input: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of input.split(",")) {
    const t = part.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function formatChipList(codes: string[]): string {
  if (!codes || codes.length === 0) return "(비어있음)";
  const shown = codes.slice(0, 5);
  const rest = codes.length - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest}` : "");
}
