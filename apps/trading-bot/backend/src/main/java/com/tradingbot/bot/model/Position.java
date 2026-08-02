package com.tradingbot.bot.model;

import java.time.Instant;

/**
 * 봇이 보유 중인 포지션 (인메모리). 서버 재시작 시 초기화됩니다.
 * 실제 KIS 계좌 잔고와 일치 보장은 없으며, 사후 검증이 필요합니다.
 */
public record Position(
        String stockCode,
        String stockName,
        int quantity,
        long entryPrice,
        Instant entryAt
) {
    public long notional() {
        return (long) quantity * entryPrice;
    }
}
