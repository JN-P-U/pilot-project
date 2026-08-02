package com.tradingbot.trading.model;

/**
 * 프론트엔드로 노출되는 주문 결과.
 */
public record OrderResult(
        boolean accepted,
        String orderNo,
        String message,
        String source
) {}
