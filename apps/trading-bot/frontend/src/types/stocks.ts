export interface StockConfig {
  currentAllowed: string[];
  pendingAllowed: string[];
  allowedRestartNeeded: boolean;
  currentCandidates: string[];
  pendingCandidates: string[];
  candidatesRestartNeeded: boolean;
  /** 위 리스트에 등장한 코드 → 종목명 사전. 미상이면 빈 문자열. */
  nameByCode: Record<string, string>;
  envFile: string;
}

export interface StockConfigSaveRequest {
  allowedStockCodes?: string[];
  botCandidates?: string[];
}

/** WeeklyCandidateAnalyzer 응답 한 종목의 상세 스코어. */
export interface WeeklyScored {
  stockCode: string;
  stockName: string;
  closePrice: number;
  weeklyReturnPct: number;
  volumeTrendPct: number;
  sma5: number;
  sma20: number;
  rsi14: number;
  totalScore: number;
}

export type AnalyzePeriod = "weekly" | "intraday";

export interface CandidateAnalyzeResponse {
  /** "weekly" = 지난주 일봉, "intraday" = 당일 분봉 기준. */
  period: AnalyzePeriod;
  message: string;
  scored: WeeklyScored[];
  /** CSV 형태로 그대로 후보 저장에 사용 가능. */
  candidates: string;
}
