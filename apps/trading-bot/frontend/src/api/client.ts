import type { BotControlResponse, BotDecision, BotStatus } from "../types/bot";
import type { ExecutionMode, ModeStatus } from "../types/mode";
import type {
  CandidateAnalyzeResponse,
  StockConfig,
  StockConfigSaveRequest,
} from "../types/stocks";
import type {
  HealthResponse,
  OrderRequest,
  OrderResult,
  Quote,
  UsExchange,
  UsQuote,
} from "../types/trading";

const BASE = "/api";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  quote: (stockCode: string) => request<Quote>(`/quotes/${stockCode}`),
  usQuote: (symbol: string, exchange: UsExchange = "NAS") =>
    request<UsQuote>(`/quotes/us/${symbol}?exchange=${exchange}`),
  order: (body: OrderRequest) =>
    request<OrderResult>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  bot: {
    status: () => request<BotStatus>("/bot/status"),
    run: () => request<BotDecision[]>("/bot/run", { method: "POST" }),
    start: () => request<BotControlResponse>("/bot/start", { method: "POST" }),
    stop: () => request<BotControlResponse>("/bot/stop", { method: "POST" }),
  },
  mode: {
    status: () => request<ModeStatus>("/mode"),
    set: (profile: ExecutionMode) =>
      request<ModeStatus>("/mode", {
        method: "POST",
        body: JSON.stringify({ profile }),
      }),
  },
  stocks: {
    config: () => request<StockConfig>("/stocks/config"),
    save: (body: StockConfigSaveRequest) =>
      request<StockConfig>("/stocks/config", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    analyze: (top = 10, universeSize = 30) =>
      request<CandidateAnalyzeResponse>(
        `/bot/candidates/analyze?top=${top}&universeSize=${universeSize}`,
      ),
    analyzeToday: (top = 10, universeSize = 30) =>
      request<CandidateAnalyzeResponse>(
        `/bot/candidates/analyze-today?top=${top}&universeSize=${universeSize}`,
      ),
  },
};
