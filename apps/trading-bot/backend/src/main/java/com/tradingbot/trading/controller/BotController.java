package com.tradingbot.trading.controller;

import com.tradingbot.bot.BotService;
import com.tradingbot.bot.discovery.WeeklyCandidateAnalyzer;
import com.tradingbot.bot.model.BotDecision;
import com.tradingbot.bot.model.BotStatus;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bot")
public class BotController {

    private final BotService botService;
    private final WeeklyCandidateAnalyzer weeklyAnalyzer;

    public BotController(BotService botService, WeeklyCandidateAnalyzer weeklyAnalyzer) {
        this.botService = botService;
        this.weeklyAnalyzer = weeklyAnalyzer;
    }

    @GetMapping("/status")
    public BotStatus status() {
        return botService.status();
    }

    /**
     * 수동 트리거. 크론과 무관하게 즉시 후보 순회 → 시그널 → 주문 흐름을 실행합니다.
     * bot.enabled / trading.order-enabled 두 스위치 상태 그대로 반영 (dry-run 여부).
     */
    @PostMapping("/run")
    public List<BotDecision> run() {
        return botService.run();
    }

    /**
     * 자동매매 시작. 스케줄러(bot.cron) 가 다음 tick 부터 결정을 처리하도록 스위치 on.
     * bot.enabled 및 trading.order-enabled 는 별도로 확인해야 실주문이 나갑니다.
     */
    @PostMapping("/start")
    public Map<String, Boolean> start() {
        return Map.of("active", botService.start());
    }

    /** 자동매매 중지. 스케줄러가 다음 tick 부터 no-op 이 됩니다. */
    @PostMapping("/stop")
    public Map<String, Boolean> stop() {
        return Map.of("active", botService.stop());
    }

    /**
     * 지난 1~2주 일봉 데이터로 후보 종목을 채점·반환합니다.
     * 응답의 {@code candidates} 필드를 그대로 {@code BOT_CANDIDATES} env 에 붙이면 STATIC 모드에서 활용 가능.
     */
    @GetMapping("/candidates/analyze")
    public Map<String, Object> analyzeCandidatesWeekly(
            @RequestParam(defaultValue = "10") int top,
            @RequestParam(defaultValue = "30") int universeSize
    ) {
        return toResponse(weeklyAnalyzer.analyze(top, universeSize));
    }

    /**
     * 당일 1분봉으로 후보 종목을 채점·반환합니다.
     * 장 시작 21분 이후부터 결과가 나오며, 그 전엔 데이터 부족으로 결과가 비을 수 있습니다.
     */
    @GetMapping("/candidates/analyze-today")
    public Map<String, Object> analyzeCandidatesToday(
            @RequestParam(defaultValue = "10") int top,
            @RequestParam(defaultValue = "30") int universeSize
    ) {
        return toResponse(weeklyAnalyzer.analyzeToday(top, universeSize));
    }

    private Map<String, Object> toResponse(WeeklyCandidateAnalyzer.Result r) {
        String csv = r.top().stream()
                .map(WeeklyCandidateAnalyzer.Scored::stockCode)
                .collect(Collectors.joining(","));
        return Map.of(
                "period", r.period(),
                "message", r.message(),
                "scored", r.top(),
                "candidates", csv
        );
    }
}
