package com.tradingbot.bot;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 봇 실행 설정. bot.enabled 가 false 여도 스케줄러는 돌지만 실제 주문은 안 나갑니다 (dry-run).
 */
@ConfigurationProperties(prefix = "bot")
public record BotProperties(
        boolean enabled,
        String cron,
        List<String> candidates,
        int quantityPerOrder,
        Sma sma,
        Rsi rsi,
        Risk risk,
        Discovery discovery,
        Sizing sizing
) {
    public record Sma(int shortWindow, int longWindow) {}

    /**
     * RSI 필터. period 는 표준 14 기본.
     * buyMax: BUY 를 허용하는 최대 RSI (이상이면 과매수로 판단하여 BUY 거부).
     * sellMin: 이 값 이상이면 SMA 크로스와 무관하게 강제 SELL.
     */
    public record Rsi(int period, double buyMax, double sellMin) {}

    /**
     * 포지션 사이징.
     * mode = ALL_IN: 매수 시 계좌 예수금(가용현금)을 조회하여 floor(cash * ratio / price) 수량으로 매수.
     * mode = FIXED: 기존 방식 (quantityPerOrder 고정).
     * 두 모드 모두 TradingGuard 의 max-quantity-per-order 상한이 최종 적용됩니다.
     */
    public record Sizing(Mode mode, double allInRatio) {
        public enum Mode { FIXED, ALL_IN }
    }

    /**
     * 손절/익절 임계값(%). 0 이면 해당 트리거 비활성.
     * 진입가 대비 현재가 손익률로 판정합니다.
     */
    public record Risk(double stopLossPct, double takeProfitPct) {}

    /**
     * 후보 종목 발굴 정책.
     * <ul>
     *   <li>STATIC: {@link BotProperties#candidates} 를 그대로 사용</li>
     *   <li>VOLUME_RANK: KIS 거래대금 순위 API 로 매 실행마다 동적 발굴</li>
     * </ul>
     * min/max Price 는 자본 대비 실 매수 가능한 종목만 남기기 위한 필터.
     */
    public record Discovery(Source source, int limit, long minPrice, long maxPrice) {
        public enum Source {
            /** BOT_CANDIDATES 그대로 사용. */
            STATIC,
            /** KIS 거래대금 순위 그대로 사용. */
            VOLUME_RANK,
            /** WeeklyCandidateAnalyzer 스코어링 상위 N 개를 캐시하며 사용. */
            TECHNICAL_ANALYSIS
        }
    }
}
