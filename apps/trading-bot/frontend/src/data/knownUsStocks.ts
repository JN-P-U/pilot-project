/**
 * 자주 조회하는 미국 주식 티커 → 회사명 힌트.
 * 참고용 라벨. 실제 상태는 KIS 응답이 진실.
 */
export const KNOWN_US_STOCKS: Record<string, string> = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  NVDA: "NVIDIA",
  GOOGL: "Alphabet (Class A)",
  AMZN: "Amazon",
  META: "Meta Platforms",
  TSLA: "Tesla",
  NFLX: "Netflix",
  AMD: "AMD",
  INTC: "Intel",
  AVGO: "Broadcom",
  QCOM: "Qualcomm",
  COIN: "Coinbase",
  PLTR: "Palantir",
  SPY: "S&P 500 ETF",
  QQQ: "Nasdaq 100 ETF",
  VOO: "Vanguard S&P 500 ETF",
};

export function localUsNameOf(symbol: string): string {
  return KNOWN_US_STOCKS[symbol] ?? "";
}
