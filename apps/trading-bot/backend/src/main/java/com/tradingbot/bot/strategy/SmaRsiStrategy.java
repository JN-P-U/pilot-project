package com.tradingbot.bot.strategy;

import com.tradingbot.bot.model.DailyBar;
import com.tradingbot.bot.model.Position;
import com.tradingbot.bot.model.Signal;
import java.util.List;
import java.util.Optional;

/**
 * SMA 크로스 신호 + RSI 필터.
 * <ul>
 *   <li>BUY: 골든크로스(단기 SMA 가 장기 SMA 를 상향 돌파) AND RSI &lt; overboughtTh
 *       — 상승 신호이지만 이미 과매수면 거른다.</li>
 *   <li>SELL: 데드크로스(단기 SMA 가 장기 SMA 를 하향 돌파) 또는 RSI &gt; strongOverboughtTh
 *       — 리스크 오버레이(손절/익절) 와 별도로, 과열 시 선제 청산.</li>
 *   <li>그 외: HOLD</li>
 * </ul>
 * 실제 매수/매도 게이팅(포지션 유무) 은 BotService 가 담당합니다.
 */
public class SmaRsiStrategy implements Strategy {

    private final int smaShort;
    private final int smaLong;
    private final int rsiPeriod;
    private final double rsiBuyMax;      // BUY 를 낼 수 있는 최대 RSI (이 값 이상이면 과매수로 판단, BUY 거부)
    private final double rsiSellMin;     // 강제 SELL 을 낼 RSI (이 값 초과이면 과매수 → 매도)

    public SmaRsiStrategy(
            int smaShort,
            int smaLong,
            int rsiPeriod,
            double rsiBuyMax,
            double rsiSellMin
    ) {
        if (smaShort >= smaLong) {
            throw new IllegalArgumentException("smaShort 는 smaLong 보다 작아야 합니다");
        }
        if (rsiPeriod < 2) {
            throw new IllegalArgumentException("rsiPeriod 는 2 이상이어야 합니다");
        }
        if (rsiBuyMax <= 0 || rsiBuyMax >= 100) {
            throw new IllegalArgumentException("rsiBuyMax 는 (0,100)");
        }
        if (rsiSellMin <= 0 || rsiSellMin >= 100) {
            throw new IllegalArgumentException("rsiSellMin 는 (0,100)");
        }
        this.smaShort = smaShort;
        this.smaLong = smaLong;
        this.rsiPeriod = rsiPeriod;
        this.rsiBuyMax = rsiBuyMax;
        this.rsiSellMin = rsiSellMin;
    }

    @Override
    public String name() {
        return "SMA(%d,%d) + RSI(%d) [buyMax=%.0f, sellMin=%.0f]"
                .formatted(smaShort, smaLong, rsiPeriod, rsiBuyMax, rsiSellMin);
    }

    @Override
    public Signal decide(String stockCode, List<DailyBar> history, Optional<Position> current) {
        int needForSma = smaLong + 1;
        int needForRsi = rsiPeriod + 1;
        int need = Math.max(needForSma, needForRsi);
        if (history.size() < need) {
            return Signal.hold("데이터 부족 (필요 %d, 보유 %d)".formatted(need, history.size()));
        }

        double shortToday = Indicators.sma(history, smaShort, 0);
        double shortYesterday = Indicators.sma(history, smaShort, 1);
        double longToday = Indicators.sma(history, smaLong, 0);
        double longYesterday = Indicators.sma(history, smaLong, 1);
        double rsiToday = Indicators.rsi(history, rsiPeriod, 0);

        boolean goldenCross = shortYesterday <= longYesterday && shortToday > longToday;
        boolean deadCross = shortYesterday >= longYesterday && shortToday < longToday;

        String summary = "SMA%d=%.0f(prev %.0f)/SMA%d=%.0f(prev %.0f), RSI%d=%.1f".formatted(
                smaShort, shortToday, shortYesterday,
                smaLong, longToday, longYesterday,
                rsiPeriod, rsiToday);

        // 우선순위 1: 강한 과매수 → 강제 매도 (포지션 있으면 청산)
        if (!Double.isNaN(rsiToday) && rsiToday >= rsiSellMin) {
            return Signal.sell("RSI 과매수(%.1f ≥ %.0f) · %s".formatted(rsiToday, rsiSellMin, summary));
        }

        if (goldenCross) {
            if (!Double.isNaN(rsiToday) && rsiToday >= rsiBuyMax) {
                return Signal.hold("골든크로스 but RSI 과매수 필터(%.1f ≥ %.0f) · %s"
                        .formatted(rsiToday, rsiBuyMax, summary));
            }
            return Signal.buy("골든크로스 · " + summary);
        }
        if (deadCross) {
            return Signal.sell("데드크로스 · " + summary);
        }
        return Signal.hold(summary);
    }
}
