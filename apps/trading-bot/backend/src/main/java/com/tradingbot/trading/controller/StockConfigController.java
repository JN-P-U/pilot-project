package com.tradingbot.trading.controller;

import com.tradingbot.bot.BotProperties;
import com.tradingbot.config.EnvFileService;
import com.tradingbot.config.TradingProperties;
import com.tradingbot.trading.model.KnownStocks;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 종목 리스트 두 개를 프론트에서 편집하기 위한 엔드포인트.
 * <ul>
 *   <li><b>allowedStockCodes</b> — TradingGuard 화이트리스트. 이 목록에 없는 종목은 주문 거부.</li>
 *   <li><b>botCandidates</b> — 봇 STATIC 발굴 모드에서 순회할 종목 리스트.</li>
 * </ul>
 * 두 값 모두 CSV 형태로 .env 에 저장되며, 실제 반영은 백엔드 재시작 시.
 * <p>
 * current 는 Spring 이 부팅 시점에 바인딩한 값 (현재 유효한 값), pending 은 .env 에 최근 저장된 값.
 * 두 값이 다르면 재시작 필요.
 * </p>
 */
@RestController
@RequestMapping("/api/stocks")
public class StockConfigController {

    private static final Logger log = LoggerFactory.getLogger(StockConfigController.class);
    private static final Pattern STOCK_CODE = Pattern.compile("^[0-9]{6}$");
    private static final String KEY_ALLOWED = "TRADING_ALLOWED_STOCK_CODES";
    private static final String KEY_CANDIDATES = "BOT_CANDIDATES";

    private final TradingProperties tradingProperties;
    private final BotProperties botProperties;
    private final EnvFileService envFile;

    public StockConfigController(
            TradingProperties tradingProperties,
            BotProperties botProperties,
            EnvFileService envFile
    ) {
        this.tradingProperties = tradingProperties;
        this.botProperties = botProperties;
        this.envFile = envFile;
    }

    @GetMapping("/config")
    public Config config() {
        List<String> currentAllowed = tradingProperties.guard() == null
                ? List.of() : safeCopy(tradingProperties.guard().allowedStockCodes());
        List<String> currentCandidates = safeCopy(botProperties.candidates());
        List<String> pendingAllowed = parseCsv(envFile.read(KEY_ALLOWED));
        List<String> pendingCandidates = parseCsv(envFile.read(KEY_CANDIDATES));

        Map<String, String> nameByCode = new LinkedHashMap<>();
        for (String c : currentAllowed) putName(nameByCode, c);
        for (String c : pendingAllowed) putName(nameByCode, c);
        for (String c : currentCandidates) putName(nameByCode, c);
        for (String c : pendingCandidates) putName(nameByCode, c);

        return new Config(
                currentAllowed,
                pendingAllowed.isEmpty() ? currentAllowed : pendingAllowed,
                !listEquals(currentAllowed, pendingAllowed) && !pendingAllowed.isEmpty(),
                currentCandidates,
                pendingCandidates.isEmpty() ? currentCandidates : pendingCandidates,
                !listEquals(currentCandidates, pendingCandidates) && !pendingCandidates.isEmpty(),
                nameByCode,
                envFile.envFilePath().toString()
        );
    }

    private void putName(Map<String, String> map, String code) {
        if (code == null || code.isBlank() || map.containsKey(code)) return;
        String name = KnownStocks.nameOf(code);
        map.put(code, name == null ? "" : name);
    }

    @PostMapping("/config")
    public ResponseEntity<?> save(@RequestBody SaveRequest req) {
        Map<String, String> updates = new LinkedHashMap<>();
        if (req != null && req.allowedStockCodes() != null) {
            List<String> normalized = normalize(req.allowedStockCodes());
            String badCode = firstInvalid(normalized);
            if (badCode != null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("허용 종목에 잘못된 코드가 있습니다: " + badCode + " (6자리 숫자만 허용)"));
            }
            updates.put(KEY_ALLOWED, String.join(",", normalized));
        }
        if (req != null && req.botCandidates() != null) {
            List<String> normalized = normalize(req.botCandidates());
            String badCode = firstInvalid(normalized);
            if (badCode != null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("후보 종목에 잘못된 코드가 있습니다: " + badCode + " (6자리 숫자만 허용)"));
            }
            updates.put(KEY_CANDIDATES, String.join(",", normalized));
        }
        if (updates.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("갱신할 필드가 없습니다 (allowedStockCodes / botCandidates 중 하나 이상)"));
        }
        try {
            envFile.updateAll(updates);
            log.info("종목 설정 저장: {}", updates.keySet());
        } catch (IOException e) {
            log.warn("종목 설정 저장 실패: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(new ErrorResponse(".env 쓰기 실패: " + e.getMessage()));
        }
        return ResponseEntity.ok(config());
    }

    private List<String> safeCopy(List<String> src) {
        if (src == null) return List.of();
        List<String> out = new ArrayList<>(src.size());
        for (String s : src) if (s != null && !s.isBlank()) out.add(s.trim());
        return out;
    }

    private List<String> parseCsv(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        List<String> out = new ArrayList<>();
        for (String s : csv.split(",")) {
            String t = s.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    /** 리스트/CSV 모두 지원. trim + 빈 값 제거 + 중복 제거 (순서 보존). */
    private List<String> normalize(List<String> input) {
        List<String> out = new ArrayList<>();
        for (String raw : input) {
            if (raw == null) continue;
            for (String s : raw.split(",")) {
                String t = s.trim();
                if (t.isEmpty()) continue;
                if (!out.contains(t)) out.add(t);
            }
        }
        return out;
    }

    private String firstInvalid(List<String> codes) {
        for (String c : codes) {
            if (!STOCK_CODE.matcher(c).matches()) return c;
        }
        return null;
    }

    private boolean listEquals(List<String> a, List<String> b) {
        if (a == null || b == null) return a == b;
        if (a.size() != b.size()) return false;
        for (int i = 0; i < a.size(); i++) if (!a.get(i).equals(b.get(i))) return false;
        return true;
    }

    public record Config(
            /** 현재 부팅 시 로드된 허용 종목 (TradingGuard 실제 사용 값). */
            List<String> currentAllowed,
            /** 다음 재시작 시 적용될 허용 종목 (.env 저장 값). 비어있으면 current 로 채워짐. */
            List<String> pendingAllowed,
            boolean allowedRestartNeeded,
            List<String> currentCandidates,
            List<String> pendingCandidates,
            boolean candidatesRestartNeeded,
            /** 위 4개 리스트에 등장한 모든 코드의 종목명 사전. 미상이면 빈 문자열. */
            Map<String, String> nameByCode,
            String envFile
    ) {}

    public record SaveRequest(
            List<String> allowedStockCodes,
            List<String> botCandidates
    ) {}

    public record ErrorResponse(String error) {}
}
