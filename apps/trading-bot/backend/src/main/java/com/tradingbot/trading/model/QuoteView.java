package com.tradingbot.trading.model;

/**
 * 프론트엔드로 노출되는 현재가 뷰. KIS 원 응답의 필드명을 정규화합니다.
 */
public record QuoteView(
        String stockCode,
        String stockName,
        String marketName,
        long currentPrice,
        long openPrice,
        long highPrice,
        long lowPrice,
        long changeAmount,
        double changeRate,
        long cumulativeVolume,
        String source
) {}
