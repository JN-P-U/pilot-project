package com.tradingbot.bot.discovery;

import com.tradingbot.bot.BotProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 기술적 분석 스코어링 결과를 매 tick 후보로 사용.
 * <p>
 * WeeklyCandidateAnalyzer 로 지난주 일봉 스코어 상위 N 개를 뽑아 캐시.
 * 캐시 TTL 안에서는 재계산 없이 이전 결과를 반환하므로 매 1분 tick 마다 KIS 를 폭탄으로 두드리지 않습니다.
 * </p>
 * <p>
 * 실패 시 stale 캐시가 있으면 그것을 반환하고, 아예 없으면 빈 리스트를 반환 (봇은 tick 을 스킵).
 * </p>
 */
public class TechnicalAnalysisCandidateProvider implements CandidateProvider {

    private static final Logger log = LoggerFactory.getLogger(TechnicalAnalysisCandidateProvider.class);

    private final WeeklyCandidateAnalyzer analyzer;
    private final int limit;
    private final int universeSize;
    private final Duration cacheTtl;

    private final AtomicReference<Cached> cache = new AtomicReference<>();

    public TechnicalAnalysisCandidateProvider(
            WeeklyCandidateAnalyzer analyzer,
            BotProperties botProperties,
            Duration cacheTtl
    ) {
        this.analyzer = analyzer;
        // 사용자가 원한 "상위 5개" 를 기본으로. bot.discovery.limit 이 있으면 그 값 사용.
        int cfgLimit = botProperties.discovery().limit();
        this.limit = cfgLimit > 0 ? cfgLimit : 5;
        // 스코어링 후보 universe. 상위 5개를 뽑으려면 최소 그 이상은 봐야 함.
        this.universeSize = Math.max(30, this.limit * 6);
        this.cacheTtl = cacheTtl;
    }

    @Override
    public List<DiscoveredCandidate> discover() {
        Cached c = cache.get();
        Instant now = Instant.now();
        if (c != null && Duration.between(c.at, now).compareTo(cacheTtl) < 0) {
            log.debug("기술적 분석 캐시 hit (남은 TTL={}s)",
                    cacheTtl.getSeconds() - Duration.between(c.at, now).getSeconds());
            return c.list;
        }

        WeeklyCandidateAnalyzer.Result r;
        try {
            r = analyzer.analyze(limit, universeSize);
        } catch (Exception e) {
            log.warn("analyzer.analyze 실패, stale 캐시로 폴백: {}", e.getMessage());
            return c == null ? Collections.emptyList() : c.list;
        }
        if (r.top().isEmpty() && c != null) {
            log.info("analyzer 결과 비어있음 → stale 캐시 유지");
            return c.list;
        }
        List<DiscoveredCandidate> list = r.top().stream()
                .map(s -> new DiscoveredCandidate(
                        s.stockCode(),
                        s.stockName(),
                        s.closePrice(),
                        s.weeklyReturnPct()
                ))
                .toList();
        cache.set(new Cached(now, list));
        log.info("기술적 분석 후보 갱신 {}건 (TTL={}s, message={})",
                list.size(), cacheTtl.getSeconds(), r.message());
        return list;
    }

    @Override
    public String sourceName() {
        return "TECHNICAL_ANALYSIS";
    }

    private record Cached(Instant at, List<DiscoveredCandidate> list) {}
}
