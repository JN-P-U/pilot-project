import { useState } from "react";
import { api } from "../api/client";
import { localNameOf } from "../data/knownStocks";
import type { OrderRequest, OrderResult, OrderSide, OrderType } from "../types/trading";

const defaultForm: OrderRequest = {
  stockCode: "005930",
  side: "BUY",
  quantity: 1,
  price: 0,
  orderType: "MARKET",
};

export function OrderPanel() {
  const [form, setForm] = useState<OrderRequest>(defaultForm);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hint = localNameOf(form.stockCode);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setResult(await api.order(form));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const update = <K extends keyof OrderRequest>(key: K, value: OrderRequest[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <section className="panel">
      <h2>주문 접수</h2>
      <div className="grid">
        <label>
          종목코드 {hint && <span className="hint inline">{hint}</span>}
          <input
            value={form.stockCode}
            onChange={(e) => update("stockCode", e.target.value.trim())}
            maxLength={6}
          />
        </label>
        <label>
          매수/매도
          <select
            value={form.side}
            onChange={(e) => update("side", e.target.value as OrderSide)}
          >
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
          </select>
        </label>
        <label>
          주문타입
          <select
            value={form.orderType}
            onChange={(e) => update("orderType", e.target.value as OrderType)}
          >
            <option value="MARKET">시장가</option>
            <option value="LIMIT">지정가</option>
          </select>
        </label>
        <label>
          수량
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => update("quantity", Number(e.target.value))}
          />
        </label>
        <label>
          단가
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => update("price", Number(e.target.value))}
            disabled={form.orderType === "MARKET"}
          />
        </label>
      </div>
      <button onClick={submit} disabled={submitting}>
        {submitting ? "전송 중..." : "주문 전송"}
      </button>
      {error && <p className="error">에러: {error}</p>}
      {result && (
        <p className={result.accepted ? "ok" : "warn"}>
          [{result.source}] {result.accepted ? "접수 성공" : "미접수"} — {result.message}
          {result.orderNo && ` / 주문번호 ${result.orderNo}`}
        </p>
      )}
    </section>
  );
}
