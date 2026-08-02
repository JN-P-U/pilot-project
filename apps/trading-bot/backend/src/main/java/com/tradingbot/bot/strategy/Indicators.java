package com.tradingbot.bot.strategy;

import com.tradingbot.bot.model.DailyBar;
import java.util.List;

/**
 * 기술적 지표 유틸.
 * 모든 메서드는 순수 함수 (같은 입력이면 같은 출력).
 * history 는 오래된 순 → 최신 순으로 정렬되어 있다고 가정.
 */
final class Indicators {

    private Indicators() {}

    /**
     * offset=0 → 최신 봉 기준, offset=1 → 하나 전 봉 기준.
     * 마지막 window 개 봉의 종가 평균.
     */
    static double sma(List<DailyBar> history, int window, int offset) {
        int end = history.size() - offset;
        int start = end - window;
        long sum = 0;
        for (int i = start; i < end; i++) {
            sum += history.get(i).close();
        }
        return (double) sum / window;
    }

    /**
     * Wilder's RSI. 표준 period=14.
     * offset=0 → 최신 봉 기준 RSI, offset=1 → 어제(하나 전) 기준.
     * 데이터 부족이면 NaN 을 반환하고 호출자가 판단.
     */
    static double rsi(List<DailyBar> history, int period, int offset) {
        int end = history.size() - offset;
        // period 만큼의 delta 를 위해 period+1 개 봉이 필요
        if (end < period + 1) return Double.NaN;
        int start = end - period - 1;

        double avgGain = 0;
        double avgLoss = 0;
        // 최초 SMA 부분 (Wilder 는 이후 지수평활이지만 여기선 단순 SMA of gains/losses 로 근사)
        for (int i = start + 1; i <= start + period; i++) {
            long delta = history.get(i).close() - history.get(i - 1).close();
            if (delta > 0) avgGain += delta;
            else avgLoss += -delta;
        }
        avgGain /= period;
        avgLoss /= period;

        // Wilder 지수평활: 남은 봉에 대해 (prev*(n-1) + curr) / n
        for (int i = start + period + 1; i < end; i++) {
            long delta = history.get(i).close() - history.get(i - 1).close();
            double gain = delta > 0 ? delta : 0;
            double loss = delta < 0 ? -delta : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        if (avgLoss == 0) return 100.0;
        double rs = avgGain / avgLoss;
        return 100.0 - (100.0 / (1.0 + rs));
    }
}
