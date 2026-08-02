package com.tradingbot.trading.model;

/**
 * 해외주식(미국 등) 시세 뷰. USD 등 통화 단위이므로 double 로 노출합니다.
 */
public record OverseasQuoteView(
        String exchange,
        String symbol,
        String currency,
        double currentPrice,
        double openPrice,
        double highPrice,
        double lowPrice,
        double previousClose,
        double changeAmount,
        double changeRate,
        long tradeVolume,
        String source
) {}
