package com.tradingbot.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * apps/trading-bot/.env 파일에서 특정 키만 안전하게 read/update 하는 유틸.
 * <p>다른 라인/주석/빈 줄은 원형 그대로 유지되어 파일 구조가 보존됩니다.</p>
 * <p>실전 매매 자격증명이 들어있는 파일이라 수정에 신중해야 하므로,
 * 사용처는 반드시 화이트리스트된 키(SPRING_PROFILES_ACTIVE / TRADING_ALLOWED_STOCK_CODES / BOT_CANDIDATES 등)
 * 만 다루세요.</p>
 */
@Service
public class EnvFileService {

    private static final Logger log = LoggerFactory.getLogger(EnvFileService.class);

    private final Path envFile;

    public EnvFileService(@Value("${bot.env-file:${user.dir}/../.env}") String envFile) {
        this.envFile = Path.of(envFile).toAbsolutePath().normalize();
    }

    public Path envFilePath() {
        return envFile;
    }

    /** 지정한 키의 현재 값(따옴표 벗김). 파일/키가 없거나 읽기 실패 시 empty. */
    public String read(String key) {
        Pattern p = keyPattern(key);
        try {
            if (!Files.exists(envFile)) return "";
            for (String raw : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
                String line = raw.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                Matcher m = p.matcher(line);
                if (m.matches()) {
                    return stripQuotes(m.group(1).trim());
                }
            }
        } catch (IOException e) {
            log.debug(".env 읽기 실패 key={}: {}", key, e.getMessage());
        }
        return "";
    }

    /**
     * 여러 키를 한 번의 IO 로 갱신합니다.
     * <ul>
     *   <li>기존 라인이 있으면 값만 교체 (앞뒤 주석 그대로).</li>
     *   <li>없으면 파일 끝에 새 섹션으로 추가.</li>
     *   <li>값에 공백이 있으면 자동으로 큰따옴표를 씌웁니다.</li>
     * </ul>
     */
    public synchronized void updateAll(Map<String, String> updates) throws IOException {
        List<String> lines;
        if (Files.exists(envFile)) {
            lines = new ArrayList<>(Files.readAllLines(envFile, StandardCharsets.UTF_8));
        } else {
            lines = new ArrayList<>();
        }

        Map<String, Boolean> replaced = new LinkedHashMap<>();
        for (String k : updates.keySet()) replaced.put(k, false);

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
            for (Map.Entry<String, String> e : updates.entrySet()) {
                if (replaced.get(e.getKey())) continue;
                if (keyPattern(e.getKey()).matcher(trimmed).matches()) {
                    lines.set(i, e.getKey() + "=" + quoteIfNeeded(e.getValue()));
                    replaced.put(e.getKey(), true);
                    break;
                }
            }
        }

        boolean anyAppended = false;
        for (Map.Entry<String, String> e : updates.entrySet()) {
            if (replaced.get(e.getKey())) continue;
            if (!anyAppended) {
                if (!lines.isEmpty() && !lines.get(lines.size() - 1).isEmpty()) {
                    lines.add("");
                }
                lines.add("# 프론트 화면에서 갱신된 값 (하단은 API 로 관리되는 섹션)");
                anyAppended = true;
            }
            lines.add(e.getKey() + "=" + quoteIfNeeded(e.getValue()));
        }

        Files.createDirectories(envFile.getParent());
        Files.writeString(
                envFile,
                String.join(System.lineSeparator(), lines) + System.lineSeparator(),
                StandardCharsets.UTF_8
        );
    }

    public void update(String key, String value) throws IOException {
        updateAll(Map.of(key, value));
    }

    private static Pattern keyPattern(String key) {
        return Pattern.compile("^\\s*" + Pattern.quote(key) + "\\s*=\\s*(.*)$");
    }

    private static String stripQuotes(String s) {
        if (s.length() >= 2 &&
                ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'")))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }

    private static String quoteIfNeeded(String s) {
        if (s == null) return "";
        if (s.isEmpty()) return "";
        if (s.contains(" ") || s.contains("\t")) return "\"" + s + "\"";
        return s;
    }
}
