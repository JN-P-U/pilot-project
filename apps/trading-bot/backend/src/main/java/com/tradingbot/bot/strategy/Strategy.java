package com.tradingbot.bot.strategy;

import com.tradingbot.bot.model.DailyBar;
import com.tradingbot.bot.model.Position;
import com.tradingbot.bot.model.Signal;
import java.util.List;
import java.util.Optional;

/**
 * 전략 인터페이스. 일봉 히스토리(오래된 순)와 현재 포지션을 받아 시그널을 낸다.
 * <p>구현체는 순수 함수처럼 결정론적이어야 합니다 (같은 입력이면 같은 시그널).</p>
 */
public interface Strategy {

    /**
     * @param stockCode 후보 종목
     * @param history   최근 N일 일봉, 오래된 것부터 최신 순으로 정렬됨
     * @param current   현재 봇 포지션 (있을 수도 없을 수도)
     */
    Signal decide(String stockCode, List<DailyBar> history, Optional<Position> current);

    String name();
}
