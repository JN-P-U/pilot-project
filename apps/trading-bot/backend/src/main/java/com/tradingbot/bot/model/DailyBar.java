package com.tradingbot.bot.model;

import java.time.Instant;

/**
 * OHLCV 봉 하나. 시간 해상도(일봉/분봉) 는 이 타입에서 구분하지 않고
 * 데이터 로드하는 쪽이 결정합니다. 필드명이 "date" 인 것은 역사적인 이유이며
 * 실제 값은 봉 종료(또는 시작) 시각 Instant 입니다.
 */
public record DailyBar(
        Instant date,
        long open,
        long high,
        long low,
        long close,
        long volume
) {}
