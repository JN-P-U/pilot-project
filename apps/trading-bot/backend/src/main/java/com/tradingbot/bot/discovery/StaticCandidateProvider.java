package com.tradingbot.bot.discovery;

import com.tradingbot.bot.BotProperties;
import com.tradingbot.trading.model.KnownStocks;
import java.util.ArrayList;
import java.util.List;

/**
 * BotProperties.candidates 를 그대로 반환. 가격 정보는 알 수 없어 0 으로 채웁니다.
 */
public class StaticCandidateProvider implements CandidateProvider {

    private final BotProperties botProperties;

    public StaticCandidateProvider(BotProperties botProperties) {
        this.botProperties = botProperties;
    }

    @Override
    public List<DiscoveredCandidate> discover() {
        List<DiscoveredCandidate> out = new ArrayList<>();
        for (String code : botProperties.candidates()) {
            out.add(new DiscoveredCandidate(code, KnownStocks.nameOf(code), 0L, 0d));
        }
        return out;
    }

    @Override
    public String sourceName() {
        return "STATIC";
    }
}
