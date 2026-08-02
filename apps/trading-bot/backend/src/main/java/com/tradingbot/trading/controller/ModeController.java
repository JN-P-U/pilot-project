package com.tradingbot.trading.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tradingbot.config.EnvFileService;
import java.io.IOException;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 프론트에서 실행 모드(mock/live) 를 선택 → apps/trading-bot/.env 의
 * {@code SPRING_PROFILES_ACTIVE} 값을 갱신합니다.
 * <p>재시작해야 반영됩니다 (부팅 시 Spring 이 프로필을 픽업하는 구조라 안전).</p>
 */
@RestController
@RequestMapping("/api/mode")
public class ModeController {

    private static final Logger log = LoggerFactory.getLogger(ModeController.class);
    private static final Set<String> ALLOWED = Set.of("mock", "live");
    private static final String KEY = "SPRING_PROFILES_ACTIVE";

    private final Environment environment;
    private final EnvFileService envFile;

    public ModeController(Environment environment, EnvFileService envFile) {
        this.environment = environment;
        this.envFile = envFile;
    }

    @GetMapping
    public Status status() {
        String[] active = environment.getActiveProfiles();
        String current = active.length == 0 ? "" : active[0];
        String pending = envFile.read(KEY);
        boolean restartNeeded = !pending.isEmpty() && !pending.equals(current);
        return new Status(
                current,
                pending.isEmpty() ? current : pending,
                restartNeeded,
                envFile.envFilePath().toString()
        );
    }

    @PostMapping
    public ResponseEntity<?> set(@RequestBody SetRequest req) {
        if (req == null || req.profile() == null || !ALLOWED.contains(req.profile())) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("허용 값: mock | live (받은 값: " + (req == null ? null : req.profile()) + ")"));
        }
        try {
            envFile.update(KEY, req.profile());
            log.info("실행 모드 저장 → {} (.env 갱신)", req.profile());
        } catch (IOException e) {
            log.warn("실행 모드 저장 실패: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(new ErrorResponse(".env 쓰기 실패: " + e.getMessage()));
        }
        return ResponseEntity.ok(status());
    }

    public record Status(
            String current,
            String pending,
            boolean restartNeeded,
            String envFile
    ) {}

    public record SetRequest(@JsonProperty("profile") String profile) {}

    public record ErrorResponse(String error) {}
}
