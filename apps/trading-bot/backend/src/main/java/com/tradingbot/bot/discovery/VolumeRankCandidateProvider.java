package com.tradingbot.bot.discovery;

import com.tradingbot.bot.BotProperties;
import com.tradingbot.config.TradingProperties;
import com.tradingbot.kis.KisApiClient;
import com.tradingbot.kis.dto.VolumeRankResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * KIS 거래대금 순위 API 로 매 실행마다 동적 후보 발굴.
 * <ul>
 *   <li>거래대금 상위 종목을 받아 옴</li>
 *   <li>가격 범위 필터 (자본 대비 실 매수 가능 종목만)</li>
 *   <li>TradingGuard 화이트리스트가 설정돼 있으면 그와 교집합만 남김 (안전망)</li>
 *   <li>상위 limit 개 반환</li>
 * </ul>
 */
public class VolumeRankCandidateProvider implements CandidateProvider {

    private static final Logger log = LoggerFactory.getLogger(VolumeRankCandidateProvider.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    // 6자리 숫자만 개별주 후보로 인정. ETP(ETF/ETN) 는 알파벳/특수 형태로 종종 등장.
    private static final Pattern INDIVIDUAL_STOCK_CODE = Pattern.compile("^[0-9]{6}$");

    // 국내 ETF/ETN 브랜드 prefix. 종목명이 이걸로 시작하면 제외.
    private static final List<String> ETF_BRANDS = List.of(
            "KODEX", "TIGER", "ACE", "SOL", "HANARO", "KOSEF", "ARIRANG",
            "RISE", "PLUS", "TIMEFOLIO", "WOORI", "MASTER", "SMART"
    );

    // 종목명에 이 단어가 들어있으면 파생 성격이 강하므로 제외.
    private static final List<String> DERIVATIVE_KEYWORDS = List.of(
            "레버리지", "인버스", "선물", "ETF", "ETN"
    );

    private final KisApiClient kisClient;
    private final BotProperties botProperties;
    private final TradingProperties tradingProperties;

    public VolumeRankCandidateProvider(
            KisApiClient kisClient,
            BotProperties botProperties,
            TradingProperties tradingProperties
    ) {
        this.kisClient = kisClient;
        this.botProperties = botProperties;
        this.tradingProperties = tradingProperties;
    }

    @Override
    public List<DiscoveredCandidate> discover() {
        BotProperties.Discovery cfg = botProperties.discovery();
        List<String> guardWhitelist = tradingProperties.guard() == null
                ? Collections.emptyList()
                : tradingProperties.guard().allowedStockCodes();

        VolumeRankResponse resp;
        try {
            resp = kisClient.fetchVolumeRanking(cfg.minPrice(), cfg.maxPrice()).block(TIMEOUT);
        } catch (Exception e) {
            log.warn("거래대금 순위 조회 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
        if (resp == null) {
            log.warn("거래대금 순위 응답 null");
            return Collections.emptyList();
        }
        log.info("거래대금 순위 응답 rt_cd={} msg_cd={} msg={} output.size={}",
                resp.rtCd(), resp.msgCd(), resp.msg(),
                resp.output() == null ? -1 : resp.output().size());
        if (resp.output() == null) {
            return Collections.emptyList();
        }

        List<DiscoveredCandidate> out = new ArrayList<>();
        for (VolumeRankResponse.Row row : resp.output()) {
            String code = row.stockCode();
            String name = row.stockName() == null ? "" : row.stockName().trim();
            if (code == null || !INDIVIDUAL_STOCK_CODE.matcher(code).matches()) continue;
            if (isEtfOrDerivative(name)) continue;

            long price = parseLong(row.currentPrice());
            if (cfg.minPrice() > 0 && price < cfg.minPrice()) continue;
            if (cfg.maxPrice() > 0 && price > cfg.maxPrice()) continue;

            // TradingGuard 화이트리스트가 있으면 그 안에 있는 것만 (안전망).
            if (guardWhitelist != null && !guardWhitelist.isEmpty() && !guardWhitelist.contains(code)) {
                continue;
            }

            out.add(new DiscoveredCandidate(code, name, price, parseDouble(row.changeRate())));
            if (out.size() >= cfg.limit()) break;
        }
        log.info("동적 후보 발굴 {}건 (source=VOLUME_RANK)", out.size());
        return out;
    }

    @Override
    public String sourceName() {
        return "VOLUME_RANK";
    }

    private boolean isEtfOrDerivative(String name) {
        if (name == null || name.isBlank()) return false;
        String upper = name.toUpperCase();
        for (String brand : ETF_BRANDS) {
            if (upper.startsWith(brand + " ") || upper.startsWith(brand + "-")) return true;
        }
        for (String kw : DERIVATIVE_KEYWORDS) {
            if (name.contains(kw)) return true;
        }
        return false;
    }

    private long parseLong(String v) {
        if (v == null || v.isBlank()) return 0L;
        try { return Long.parseLong(v.trim()); }
        catch (NumberFormatException e) { return 0L; }
    }

    private double parseDouble(String v) {
        if (v == null || v.isBlank()) return 0d;
        try { return Double.parseDouble(v.trim()); }
        catch (NumberFormatException e) { return 0d; }
    }
}
