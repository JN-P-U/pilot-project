package com.tradingbot.bot.model;

/**
 * 봇 상태 조회 시점의 포지션 스냅샷. 미실현 손익 표시용.
 */
public record PositionSnapshot(
        long currentPrice,
        long unrealizedPnl,
        double unrealizedPnlPct
) {}
