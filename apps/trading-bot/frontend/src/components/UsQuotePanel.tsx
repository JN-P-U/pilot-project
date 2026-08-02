import { useState } from "react";
import { api } from "../api/client";
import { localUsNameOf } from "../data/knownUsStocks";
import type { UsExchange, UsQuote } from "../types/trading";

const EXCHANGES: { code: UsExchange; label: string }[] = [
  { code: "NAS", label: "NASDAQ" },
  { code: "NYS", label: "NYSE" },
  { code: "AMS", label: "AMEX" },
];

export function UsQuotePanel() {
  const [symbol, setSymbol] = useState("AAPL");
  const [exchange, setExchange] = useState<UsExchange>("NAS");
  const [quote, setQuote] = useState<UsQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hint = localUsNameOf(symbol);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setQuote(await api.usQuote(symbol, exchange));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>미국주식 현재가</h2>
      <div className="row input-row">
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value as UsExchange)}
        >
          {EXCHANGES.map((x) => (
            <option key={x.code} value={x.code}>
              {x.label}
            </option>
          ))}
        </select>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase().trim())}
          placeholder="티커 (예: AAPL, TSLA)"
          maxLength={10}
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
            <h3>{localUsNameOf(quote.symbol) || quote.symbol}</h3>
            <div className="quote-sub">
              <span className="mono">{quote.symbol}</span>
              <span>· {quote.exchange}</span>
              <span>· {quote.currency}</span>
              <span className="source">· {quote.source}</span>
            </div>
          </header>
          <div className="quote-price">
            <span className="price-value">
              {quote.currency === "USD" ? "$" : ""}
              {quote.currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className={`price-change ${quote.changeAmount >= 0 ? "up-us" : "down-us"}`}>
              {quote.changeAmount >= 0 ? "▲" : "▼"}
              {" "}
              {Math.abs(quote.changeAmount).toFixed(2)}
              {" "}
              ({quote.changeRate.toFixed(2)}%)
            </span>
          </div>
          <dl className="quote">
            <dt>시가</dt><dd>{quote.openPrice.toFixed(2)}</dd>
            <dt>고가</dt><dd>{quote.highPrice.toFixed(2)}</dd>
            <dt>저가</dt><dd>{quote.lowPrice.toFixed(2)}</dd>
            <dt>전일 종가</dt><dd>{quote.previousClose.toFixed(2)}</dd>
            <dt>거래량</dt><dd>{quote.tradeVolume.toLocaleString()}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}
