package com.tradingbot.bot.model;

import java.time.Instant;

/**
 * 단일 후보 종목에 대한 봇 결정 로그 1행.
 * outcome 은 시그널 이후 실제 처리 결과 (예: "ordered qty=1", "hold", "guard blocked: ...", "error: ...").
 */
public record BotDecision(
        Instant decidedAt,
        String stockCode,
        String stockName,
        Signal signal,
        long referencePrice,
        String outcome
) {}
