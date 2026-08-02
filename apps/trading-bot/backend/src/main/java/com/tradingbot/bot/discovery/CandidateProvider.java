package com.tradingbot.bot.discovery;

import java.util.List;

/**
 * 봇이 순회할 후보 종목을 결정한다. 구현체는 요청마다 stateless 로 동작.
 */
public interface CandidateProvider {
    List<DiscoveredCandidate> discover();
    String sourceName();
}
