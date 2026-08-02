package com.tradingbot.bot.discovery;

/**
 * 발굴된 후보 종목 요약. UI 표시 및 실행 순서 결정에 사용.
 */
public record DiscoveredCandidate(
        String stockCode,
        String stockName,
        long currentPrice,
        double changeRate
) {}
