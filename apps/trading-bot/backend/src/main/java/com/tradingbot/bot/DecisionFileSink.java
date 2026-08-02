package com.tradingbot.bot;

import com.tradingbot.bot.model.BotDecision;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 봇 의사결정을 apps/trading-bot/log/YYYY-MM-DD.md 로 append 저장합니다.
 * <ul>
 *   <li>파일 포맷: 마크다운 표. 사람 눈으로도, 스크립트/에이전트 파싱도 잘 됩니다.</li>
 *   <li>날짜별로 하나의 파일 → 로그 회전 부담 없이 그날 흐름을 한 번에 리뷰.</li>
 *   <li>파일이 없으면 헤더(구성 요약 + 표 헤더) 를 먼저 씁니다.</li>
 * </ul>
 * IO 실패는 로그만 남기고 봇 결정 흐름을 중단시키지 않습니다.
 */
@Component
public class DecisionFileSink {

    private static final Logger log = LoggerFactory.getLogger(DecisionFileSink.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final Path logDir;
    private final ConcurrentMap<LocalDate, Object> dayLocks = new ConcurrentHashMap<>();
    private final ConcurrentMap<LocalDate, Boolean> headerWritten = new ConcurrentHashMap<>();

    public DecisionFileSink(@Value("${bot.log.dir:${user.dir}/../log}") String dir) {
        this.logDir = Path.of(dir).toAbsolutePath().normalize();
    }

    public void write(BotDecision d) {
        try {
            LocalDate day = d.decidedAt().atZone(KST).toLocalDate();
            Path file = filePath(day);
            Files.createDirectories(file.getParent());
            synchronized (dayLocks.computeIfAbsent(day, k -> new Object())) {
                if (!Boolean.TRUE.equals(headerWritten.get(day)) && !Files.exists(file)) {
                    Files.writeString(file, header(day), StandardCharsets.UTF_8,
                            StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                }
                headerWritten.put(day, Boolean.TRUE);
                Files.writeString(file, row(d), StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            }
        } catch (IOException e) {
            log.warn("의사결정 파일 로깅 실패: {}", e.getMessage());
        }
    }

    private Path filePath(LocalDate day) {
        return logDir.resolve(DATE.format(day) + ".md");
    }

    private String header(LocalDate day) {
        return """
                # trading-bot 의사결정 로그 — %s (KST)

                각 행은 봇 실행 tick 에서 단일 종목에 대해 내린 결정입니다.
                - **signal**: BUY / SELL / HOLD
                - **price**: 결정 시점의 참조 가격 (KIS 현재가 또는 최신 분봉 종가)
                - **outcome**: 실제 처리 결과 (`ordered ...`, `hold`, `dry-run: ...`, `guard blocked: ...`, `skip: ...`, `error: ...`)

                | time | code | name | signal | reason | price | outcome |
                |------|------|------|--------|--------|-------|---------|
                """.formatted(DATE.format(day));
    }

    private String row(BotDecision d) {
        String time = TIME.format(d.decidedAt().atZone(KST).toLocalTime());
        return "| %s | `%s` | %s | **%s** | %s | %s | %s |%n".formatted(
                time,
                nullSafe(d.stockCode()),
                escape(d.stockName()),
                d.signal() == null ? "?" : d.signal().action().name(),
                d.signal() == null ? "" : escape(d.signal().reason()),
                d.referencePrice() > 0 ? String.format("%,d", d.referencePrice()) : "-",
                escape(d.outcome())
        );
    }

    /** 마크다운 표 파이프 문자와 개행을 이스케이프. */
    private String escape(String s) {
        if (s == null || s.isEmpty()) return "";
        return s.replace("\\", "\\\\")
                .replace("|", "\\|")
                .replace("\n", " ")
                .replace("\r", " ");
    }

    private String nullSafe(String s) {
        return s == null ? "" : s;
    }

    /** 테스트 및 디버그용. */
    public Path logDir() {
        return logDir;
    }
}
