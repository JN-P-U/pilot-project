import { useState } from "react";
import { api } from "../api/client";
import { localNameOf } from "../data/knownStocks";
import type { Quote } from "../types/trading";

export function QuotePanel() {
  const [code, setCode] = useState("005930");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hint = localNameOf(code);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setQuote(await api.quote(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>현재가 조회</h2>
      <div className="row input-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          placeholder="종목코드 (예: 005930)"
          maxLength={6}
        />
        {hint && <span className="hint">{hint}</span>}
        <button onClick={load} disabled={loading}>
          {loading ? "조회 중..." : "조회"}
        </button>
      </div>
      {error && <p className="error">에러: {error}</p>}
      {quote && (
        <div className="quote-result">
          <header className="quote-header">
            <h3>{quote.stockName || localNameOf(quote.stockCode) || quote.stockCode}</h3>
            <div className="quote-sub">
              <span className="mono">{quote.stockCode}</span>
              {quote.marketName && <span>· {quote.marketName}</span>}
              <span className="source">· {quote.source}</span>
            </div>
          </header>
          <div className="quote-price">
            <span className="price-value">{quote.currentPrice.toLocaleString()}</span>
            <span className={`price-change ${quote.changeAmount >= 0 ? "up" : "down"}`}>
              {quote.changeAmount >= 0 ? "▲" : "▼"}
              {" "}
              {Math.abs(quote.changeAmount).toLocaleString()}
              {" "}
              ({quote.changeRate.toFixed(2)}%)
            </span>
          </div>
          <dl className="quote">
            <dt>시가</dt><dd>{quote.openPrice.toLocaleString()}</dd>
            <dt>고가</dt><dd>{quote.highPrice.toLocaleString()}</dd>
            <dt>저가</dt><dd>{quote.lowPrice.toLocaleString()}</dd>
            <dt>누적거래량</dt><dd>{quote.cumulativeVolume.toLocaleString()}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}
