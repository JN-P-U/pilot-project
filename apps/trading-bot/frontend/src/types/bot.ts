export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface Signal {
  action: SignalAction;
  reason: string;
}

export interface Position {
  stockCode: string;
  stockName: string;
  quantity: number;
  entryPrice: number;
  entryAt: string;
}

export interface PositionSnapshot {
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface BotDecision {
  decidedAt: string;
  stockCode: string;
  stockName: string;
  signal: Signal;
  referencePrice: number;
  outcome: string;
}

export interface DiscoveredCandidate {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  changeRate: number;
}

export interface BotStatus {
  /** 프론트 시작 버튼으로 켠 상태인지 (런타임). */
  active: boolean;
  /** 설정상 bot.enabled 값. active 과 별개로 실주문 게이트. */
  enabled: boolean;
  dryRun: boolean;
  cron: string;
  discoverySource: string;
  discoveredCandidates: DiscoveredCandidate[];
  stopLossPct: number;
  takeProfitPct: number;
  position: Position | null;
  positionSnapshot: PositionSnapshot | null;
  lastRunAt: string | null;
  recentDecisions: BotDecision[];
}

export interface BotControlResponse {
  active: boolean;
}
