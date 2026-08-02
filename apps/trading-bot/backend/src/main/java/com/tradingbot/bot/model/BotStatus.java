package com.tradingbot.bot.model;

import com.tradingbot.bot.discovery.DiscoveredCandidate;
import java.time.Instant;
import java.util.List;

/**
 * /api/bot/status 응답.
 */
public record BotStatus(
        /** 프론트 UI 에서 사용자가 시작/중지 버튼으로 토글하는 런타임 활성 상태. */
        boolean active,
        /** application.yml / env 로 관리되는 config 상 봇 활성 여부. */
        boolean enabled,
        boolean dryRun,
        String cron,
        String discoverySource,
        List<DiscoveredCandidate> discoveredCandidates,
        double stopLossPct,
        double takeProfitPct,
        Position position,
        PositionSnapshot positionSnapshot,
        Instant lastRunAt,
        List<BotDecision> recentDecisions
) {}
