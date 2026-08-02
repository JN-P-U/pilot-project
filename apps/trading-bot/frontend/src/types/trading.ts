export interface Quote {
  stockCode: string;
  stockName: string;
  marketName: string;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  changeAmount: number;
  changeRate: number;
  cumulativeVolume: number;
  source: string;
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";

export interface OrderRequest {
  stockCode: string;
  side: OrderSide;
  quantity: number;
  price: number;
  orderType: OrderType;
}

export interface OrderResult {
  accepted: boolean;
  orderNo: string | null;
  message: string;
  source: string;
}

export interface HealthResponse {
  status: string;
  profiles: string[];
}

export type UsExchange = "NAS" | "NYS" | "AMS";

export interface UsQuote {
  exchange: UsExchange | string;
  symbol: string;
  currency: string;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  changeAmount: number;
  changeRate: number;
  tradeVolume: number;
  source: string;
}
