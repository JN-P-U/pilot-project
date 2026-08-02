import { BotPanel } from "./components/BotPanel";
import { HealthBadge } from "./components/HealthBadge";
import { ModeSelector } from "./components/ModeSelector";
import { OrderPanel } from "./components/OrderPanel";
import { QuotePanel } from "./components/QuotePanel";
import { StockConfigPanel } from "./components/StockConfigPanel";
import { UsQuotePanel } from "./components/UsQuotePanel";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>Trading Bot</h1>
        <HealthBadge />
      </header>
      <main>
        <ModeSelector />
        <StockConfigPanel />
        <BotPanel />
        <QuotePanel />
        <UsQuotePanel />
        <OrderPanel />
      </main>
      <footer>
        <p>
          KIS OpenAPI 기반 자동 매매 실험용. 실전 주문 시 반드시{" "}
          <code>TRADING_ORDER_ENABLED=true</code> 와 <code>KIS_LIVE=true</code>{" "}
          플래그를 명시하세요.
        </p>
      </footer>
    </div>
  );
}
